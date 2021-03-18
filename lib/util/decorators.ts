/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { global } from "../util/global";
import { Type } from "../interface/type";

const Reflect = global["Reflect"];

/**
 * @suppress {globalThis}
 */
export function makeDecorator(
  name: string,
  props?: (...args: any[]) => any
): (...args: any[]) => (cls: any) => any {
  const metaCtor = makeMetadataCtor(props);

  function DecoratorFactory(this: any, objOrType: any): (cls: any) => any {
    if (!(Reflect && Reflect.getOwnMetadata)) {
      throw "reflect-metadata shim is required when using class decorators";
    }

    if (this instanceof DecoratorFactory) {
      metaCtor.call(this, objOrType);
      return this as typeof DecoratorFactory;
    }

    const annotationInstance = new (<any>DecoratorFactory)(objOrType);
    return function TypeDecorator(cls: Type<any>) {
      const annotations = Reflect.getOwnMetadata("annotations", cls) || [];
      annotations.push(annotationInstance);
      Reflect.defineMetadata("annotations", annotations, cls);
      return cls;
    };
  }

  DecoratorFactory.prototype.toString = () => `@${name}`;
  (<any>DecoratorFactory).annotationCls = DecoratorFactory;
  return DecoratorFactory;
}

function makeMetadataCtor(props?: (...args: any[]) => any): any {
  return function ctor(this: any, ...args: any[]) {
    if (props) {
      const values = props(...args);
      for (const propName in values) {
        this[propName] = values[propName];
      }
    }
  };
}

export function makeParamDecorator(
  name: string,
  props?: (...args: any[]) => any
): any {
  const metaCtor = makeMetadataCtor(props);
  function ParamDecoratorFactory(this: unknown, ...args: any[]): any {
    if (this instanceof ParamDecoratorFactory) {
      metaCtor.apply(this, args);
      return this;
    }
    const annotationInstance = new (<any>ParamDecoratorFactory)(...args);

    (<any>ParamDecorator).annotation = annotationInstance;
    return ParamDecorator;

    function ParamDecorator(cls: any, unusedKey: any, index: number): any {
      const parameters: (any[] | null)[] =
        Reflect.getOwnMetadata("parameters", cls) || [];

      // there might be gaps if some in between parameters do not have annotations.
      // we pad with nulls.
      while (parameters.length <= index) {
        parameters.push(null);
      }

      parameters[index] = parameters[index] || [];
      parameters[index]!.push(annotationInstance);

      Reflect.defineMetadata("parameters", parameters, cls);
      return cls;
    }
  }
  ParamDecoratorFactory.prototype.toString = () => `@${name}`;
  (<any>ParamDecoratorFactory).annotationCls = ParamDecoratorFactory;
  return ParamDecoratorFactory;
}
