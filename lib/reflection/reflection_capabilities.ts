/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Type, isType } from "../interface/type";

import { PlatformReflectionCapabilities } from "./platform_reflection_capabilities";
import { global } from "../util/global";

/*
 * #########################
 * Attention: These Regular expressions have to hold even if the code is minified!
 * ##########################
 */

/**
 * Regular expression that detects pass-through constructors for ES5 output. This Regex
 * intends to capture the common delegation pattern emitted by TypeScript and Babel. Also
 * it intends to capture the pattern where existing constructors have been downleveled from
 * ES2015 to ES5 using TypeScript w/ downlevel iteration. e.g.
 *
 * ```
 *   function MyClass() {
 *     var _this = _super.apply(this, arguments) || this;
 * ```
 *
 * ```
 *   function MyClass() {
 *     var _this = _super.apply(this, __spread(arguments)) || this;
 * ```
 *
 * More details can be found in: https://github.com/angular/angular/issues/38453.
 */
export const ES5_DELEGATE_CTOR = /^function\s+\S+\(\)\s*{[\s\S]+\.apply\(this,\s*(arguments|[^()]+\(arguments\))\)/;
/** Regular expression that detects ES2015 classes which extend from other classes. */
export const ES2015_INHERITED_CLASS = /^class\s+[A-Za-z\d$_]*\s*extends\s+[^{]+{/;
/**
 * Regular expression that detects ES2015 classes which extend from other classes and
 * have an explicit constructor defined.
 */
export const ES2015_INHERITED_CLASS_WITH_CTOR = /^class\s+[A-Za-z\d$_]*\s*extends\s+[^{]+{[\s\S]*constructor\s*\(/;
/**
 * Regular expression that detects ES2015 classes which extend from other classes
 * and inherit a constructor.
 */
export const ES2015_INHERITED_CLASS_WITH_DELEGATE_CTOR = /^class\s+[A-Za-z\d$_]*\s*extends\s+[^{]+{[\s\S]*constructor\s*\(\)\s*{\s*super\(\.\.\.arguments\)/;

/**
 * Determine whether a stringified type is a class which delegates its constructor
 * to its parent.
 *
 * This is not trivial since compiled code can actually contain a constructor function
 * even if the original source code did not. For instance, when the child class contains
 * an initialized instance property.
 */
export function isDelegateCtor(typeStr: string): boolean {
  return (
    ES5_DELEGATE_CTOR.test(typeStr) ||
    ES2015_INHERITED_CLASS_WITH_DELEGATE_CTOR.test(typeStr) ||
    (ES2015_INHERITED_CLASS.test(typeStr) &&
      !ES2015_INHERITED_CLASS_WITH_CTOR.test(typeStr))
  );
}
export class ReflectionCapabilities implements PlatformReflectionCapabilities {
  private _reflect: any;

  constructor(reflect?: any) {
    this._reflect = reflect || global["Reflect"];
  }

  factory<T>(t: Type<T>): (args: any[]) => T {
    return (...args: any[]) => new t(...args);
  }

  /** @internal */
  _zipTypesAndAnnotations(paramTypes: any[], paramAnnotations: any[]): any[][] {
    let result: any[][];

    if (typeof paramTypes === "undefined") {
      result = new Array(paramAnnotations.length);
    } else {
      result = new Array(paramTypes.length);
    }

    for (let i = 0; i < result.length; i++) {
      // TS outputs Object for parameters without types, while Traceur omits
      // the annotations. For now we preserve the Traceur behavior to aid
      // migration, but this can be revisited.
      if (typeof paramTypes === "undefined") {
        result[i] = [];
      } else if (paramTypes[i] && paramTypes[i] != Object) {
        result[i] = [paramTypes[i]];
      } else {
        result[i] = [];
      }
      if (paramAnnotations && paramAnnotations[i] != null) {
        result[i] = result[i].concat(paramAnnotations[i]);
      }
    }
    return result;
  }

  private _ownParameters(type: Type<any>, parentCtor: any): any[][] | null {
    const typeStr = type.toString();
    // If we have no decorators, we only have function.length as metadata.
    // In that case, to detect whether a child class declared an own constructor or not,
    // we need to look inside of that constructor to check whether it is
    // just calling the parent.
    // This also helps to work around for https://github.com/Microsoft/TypeScript/issues/12439
    // that sets 'design:paramtypes' to []
    // if a class inherits from another class but has no ctor declared itself.
    if (isDelegateCtor(typeStr)) {
      return null;
    }

    // API for metadata created by invoking the decorators.
    if (this._reflect != null && this._reflect.getOwnMetadata != null) {
      const paramAnnotations = this._reflect.getOwnMetadata("parameters", type);
      const paramTypes = this._reflect.getOwnMetadata(
        "design:paramtypes",
        type
      );
      if (paramTypes || paramAnnotations) {
        return this._zipTypesAndAnnotations(paramTypes, paramAnnotations);
      }
    }

    // If a class has no decorators, at least create metadata
    // based on function.length.
    // Note: We know that this is a real constructor as we checked
    // the content of the constructor above.
    return new Array(<any>type.length).fill(undefined);
  }

  parameters(type: Type<any>): any[][] {
    // Note: only report metadata if we have at least one class decorator
    // to stay in sync with the static reflector.
    if (!isType(type)) {
      return [];
    }
    const parentCtor = getParentCtor(type);
    let parameters = this._ownParameters(type, parentCtor);
    if (!parameters && parentCtor !== Object) {
      parameters = this.parameters(parentCtor);
    }
    return parameters || [];
  }

  private _ownAnnotations(
    typeOrFunc: Type<any>,
    parentCtor: any
  ): any[] | null {
    // Prefer the direct API.
    if (
      (<any>typeOrFunc).annotations &&
      (<any>typeOrFunc).annotations !== parentCtor.annotations
    ) {
      let annotations = (<any>typeOrFunc).annotations;
      if (typeof annotations === "function" && annotations.annotations) {
        annotations = annotations.annotations;
      }
      return annotations;
    }

    // API for metadata created by invoking the decorators.
    if (this._reflect && this._reflect.getOwnMetadata) {
      return this._reflect.getOwnMetadata("annotations", typeOrFunc);
    }
    return null;
  }

  annotations(typeOrFunc: Type<any>): any[] {
    if (!isType(typeOrFunc)) {
      return [];
    }
    const parentCtor = getParentCtor(typeOrFunc);
    const ownAnnotations = this._ownAnnotations(typeOrFunc, parentCtor) || [];
    const parentAnnotations =
      parentCtor !== Object ? this.annotations(parentCtor) : [];
    return parentAnnotations.concat(ownAnnotations);
  }

  private _ownPropMetadata(
    typeOrFunc: any,
    parentCtor: any
  ): { [key: string]: any[] } | null {
    // Prefer the direct API.
    if (
      (<any>typeOrFunc).propMetadata &&
      (<any>typeOrFunc).propMetadata !== parentCtor.propMetadata
    ) {
      let propMetadata = (<any>typeOrFunc).propMetadata;
      if (typeof propMetadata === "function" && propMetadata.propMetadata) {
        propMetadata = propMetadata.propMetadata;
      }
      return propMetadata;
    }

    // API for metadata created by invoking the decorators.
    if (this._reflect && this._reflect.getOwnMetadata) {
      return this._reflect.getOwnMetadata("propMetadata", typeOrFunc);
    }
    return null;
  }

  propMetadata(typeOrFunc: any): { [key: string]: any[] } {
    if (!isType(typeOrFunc)) {
      return {};
    }
    const parentCtor = getParentCtor(typeOrFunc);
    const propMetadata: { [key: string]: any[] } = {};
    if (parentCtor !== Object) {
      const parentPropMetadata = this.propMetadata(parentCtor);
      Object.keys(parentPropMetadata).forEach((propName) => {
        propMetadata[propName] = parentPropMetadata[propName];
      });
    }
    const ownPropMetadata = this._ownPropMetadata(typeOrFunc, parentCtor);
    if (ownPropMetadata) {
      Object.keys(ownPropMetadata).forEach((propName) => {
        const decorators: any[] = [];
        if (propMetadata.hasOwnProperty(propName)) {
          decorators.push(...propMetadata[propName]);
        }
        decorators.push(...ownPropMetadata[propName]);
        propMetadata[propName] = decorators;
      });
    }
    return propMetadata;
  }
}

function getParentCtor(ctor: Function): Type<any> {
  if (!ctor.prototype) {
    return Object;
  }
  const parentProto = Object.getPrototypeOf(ctor.prototype);
  const parentCtor = parentProto ? parentProto.constructor : null;
  // Note: We always use `Object` as the null value
  // to simplify checking later on.
  return parentCtor || Object;
}
