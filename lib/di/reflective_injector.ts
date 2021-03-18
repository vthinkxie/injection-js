/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Injector } from "./injector";
import { Self, SkipSelf } from "./metadata";
import { Provider } from "./provider";
import {
  cyclicDependencyError,
  instantiationError,
  noProviderError,
  outOfBoundsError,
} from "./reflective_errors";
import { ReflectiveKey } from "./reflective_key";
import {
  ReflectiveDependency,
  ResolvedReflectiveFactory,
  ResolvedReflectiveProvider,
  resolveReflectiveProviders,
} from "./reflective_provider";

const THROW_IF_NOT_FOUND = {};
// Threshold for the dynamic version
const UNDEFINED = {};

/**
 * A ReflectiveDependency injection container used for instantiating objects and resolving
 * dependencies.
 *
 * An `Injector` is a replacement for a `new` operator, which can automatically resolve the
 * constructor dependencies.
 *
 * In typical use, application code asks for the dependencies in the constructor and they are
 * resolved by the `Injector`.
 *
 * ### Example ([live demo](http://plnkr.co/edit/jzjec0?p=preview))
 *
 * The following example creates an `Injector` configured to create `Engine` and `Car`.
 *
 * ```typescript
 * @Injectable()
 * class Engine {
 * }
 *
 * @Injectable()
 * class Car {
 *   constructor(public engine:Engine) {}
 * }
 *
 * var injector = ReflectiveInjector.resolveAndCreate([Car, Engine]);
 * var car = injector.get(Car);
 * expect(car instanceof Car).toBe(true);
 * expect(car.engine instanceof Engine).toBe(true);
 * ```
 *
 * Notice, we don't use the `new` operator because we explicitly want to have the `Injector`
 * resolve all of the object's dependencies automatically.
 *
 * @stable
 */
export abstract class ReflectiveInjector implements Injector {
  /**
   * Turns an array of provider definitions into an array of resolved providers.
   *
   * A resolution is a process of flattening multiple nested arrays and converting individual
   * providers into an array of {@link ResolvedReflectiveProvider}s.
   *
   * ### Example ([live demo](http://plnkr.co/edit/AiXTHi?p=preview))
   *
   * ```typescript
   * @Injectable()
   * class Engine {
   * }
   *
   * @Injectable()
   * class Car {
   *   constructor(public engine:Engine) {}
   * }
   *
   * var providers = ReflectiveInjector.resolve([Car, [[Engine]]]);
   *
   * expect(providers.length).toEqual(2);
   *
   * expect(providers[0] instanceof ResolvedReflectiveProvider).toBe(true);
   * expect(providers[0].key.displayName).toBe("Car");
   * expect(providers[0].dependencies.length).toEqual(1);
   * expect(providers[0].factory).toBeDefined();
   *
   * expect(providers[1].key.displayName).toBe("Engine");
   * });
   * ```
   *
   * See {@link ReflectiveInjector#fromResolvedProviders} for more info.
   */
  static resolve(providers: Provider[]): ResolvedReflectiveProvider[] {
    return resolveReflectiveProviders(providers);
  }

  /**
   * Resolves an array of providers and creates an injector from those providers.
   *
   * The passed-in providers can be an array of `Type`, {@link Provider},
   * or a recursive array of more providers.
   *
   * ### Example ([live demo](http://plnkr.co/edit/ePOccA?p=preview))
   *
   * ```typescript
   * @Injectable()
   * class Engine {
   * }
   *
   * @Injectable()
   * class Car {
   *   constructor(public engine:Engine) {}
   * }
   *
   * var injector = ReflectiveInjector.resolveAndCreate([Car, Engine]);
   * expect(injector.get(Car) instanceof Car).toBe(true);
   * ```
   *
   * This function is slower than the corresponding `fromResolvedProviders`
   * because it needs to resolve the passed-in providers first.
   * See {@link Injector#resolve} and {@link Injector#fromResolvedProviders}.
   */
  static resolveAndCreate(
    providers: Provider[],
    parent?: Injector
  ): ReflectiveInjector {
    const ResolvedReflectiveProviders = ReflectiveInjector.resolve(providers);
    return ReflectiveInjector.fromResolvedProviders(
      ResolvedReflectiveProviders,
      parent
    );
  }

  /**
   * Creates an injector from previously resolved providers.
   *
   * This API is the recommended way to construct injectors in performance-sensitive parts.
   *
   * ### Example ([live demo](http://plnkr.co/edit/KrSMci?p=preview))
   *
   * ```typescript
   * @Injectable()
   * class Engine {
   * }
   *
   * @Injectable()
   * class Car {
   *   constructor(public engine:Engine) {}
   * }
   *
   * var providers = ReflectiveInjector.resolve([Car, Engine]);
   * var injector = ReflectiveInjector.fromResolvedProviders(providers);
   * expect(injector.get(Car) instanceof Car).toBe(true);
   * ```
   * @experimental
   */
  static fromResolvedProviders(
    providers: ResolvedReflectiveProvider[],
    parent?: Injector
  ): ReflectiveInjector {
    return new ReflectiveInjector_(providers, parent);
  }

  /**
   * Parent of this injector.
   *
   * <!-- TODO: Add a link to the section of the user guide talking about hierarchical injection.
   * -->
   *
   * ### Example ([live demo](http://plnkr.co/edit/eosMGo?p=preview))
   *
   * ```typescript
   * var parent = ReflectiveInjector.resolveAndCreate([]);
   * var child = parent.resolveAndCreateChild([]);
   * expect(child.parent).toBe(parent);
   * ```
   */
  abstract get parent(): Injector | null;

  /**
   * Resolves an array of providers and creates a child injector from those providers.
   *
   * <!-- TODO: Add a link to the section of the user guide talking about hierarchical injection.
   * -->
   *
   * The passed-in providers can be an array of `Type`, {@link Provider},
   * or a recursive array of more providers.
   *
   * ### Example ([live demo](http://plnkr.co/edit/opB3T4?p=preview))
   *
   * ```typescript
   * class ParentProvider {}
   * class ChildProvider {}
   *
   * var parent = ReflectiveInjector.resolveAndCreate([ParentProvider]);
   * var child = parent.resolveAndCreateChild([ChildProvider]);
   *
   * expect(child.get(ParentProvider) instanceof ParentProvider).toBe(true);
   * expect(child.get(ChildProvider) instanceof ChildProvider).toBe(true);
   * expect(child.get(ParentProvider)).toBe(parent.get(ParentProvider));
   * ```
   *
   * This function is slower than the corresponding `createChildFromResolved`
   * because it needs to resolve the passed-in providers first.
   * See {@link Injector#resolve} and {@link Injector#createChildFromResolved}.
   */
  abstract resolveAndCreateChild(providers: Provider[]): ReflectiveInjector;

  /**
   * Creates a child injector from previously resolved providers.
   *
   * <!-- TODO: Add a link to the section of the user guide talking about hierarchical injection.
   * -->
   *
   * This API is the recommended way to construct injectors in performance-sensitive parts.
   *
   * ### Example ([live demo](http://plnkr.co/edit/VhyfjN?p=preview))
   *
   * ```typescript
   * class ParentProvider {}
   * class ChildProvider {}
   *
   * var parentProviders = ReflectiveInjector.resolve([ParentProvider]);
   * var childProviders = ReflectiveInjector.resolve([ChildProvider]);
   *
   * var parent = ReflectiveInjector.fromResolvedProviders(parentProviders);
   * var child = parent.createChildFromResolved(childProviders);
   *
   * expect(child.get(ParentProvider) instanceof ParentProvider).toBe(true);
   * expect(child.get(ChildProvider) instanceof ChildProvider).toBe(true);
   * expect(child.get(ParentProvider)).toBe(parent.get(ParentProvider));
   * ```
   */
  abstract createChildFromResolved(
    providers: ResolvedReflectiveProvider[]
  ): ReflectiveInjector;

  /**
   * Resolves a provider and instantiates an object in the context of the injector.
   *
   * The created object does not get cached by the injector.
   *
   * ### Example ([live demo](http://plnkr.co/edit/yvVXoB?p=preview))
   *
   * ```typescript
   * @Injectable()
   * class Engine {
   * }
   *
   * @Injectable()
   * class Car {
   *   constructor(public engine:Engine) {}
   * }
   *
   * var injector = ReflectiveInjector.resolveAndCreate([Engine]);
   *
   * var car = injector.resolveAndInstantiate(Car);
   * expect(car.engine).toBe(injector.get(Engine));
   * expect(car).not.toBe(injector.resolveAndInstantiate(Car));
   * ```
   */
  abstract resolveAndInstantiate(provider: Provider): any;

  /**
   * Instantiates an object using a resolved provider in the context of the injector.
   *
   * The created object does not get cached by the injector.
   *
   * ### Example ([live demo](http://plnkr.co/edit/ptCImQ?p=preview))
   *
   * ```typescript
   * @Injectable()
   * class Engine {
   * }
   *
   * @Injectable()
   * class Car {
   *   constructor(public engine:Engine) {}
   * }
   *
   * var injector = ReflectiveInjector.resolveAndCreate([Engine]);
   * var carProvider = ReflectiveInjector.resolve([Car])[0];
   * var car = injector.instantiateResolved(carProvider);
   * expect(car.engine).toBe(injector.get(Engine));
   * expect(car).not.toBe(injector.instantiateResolved(carProvider));
   * ```
   */
  abstract instantiateResolved(provider: ResolvedReflectiveProvider): any;

  abstract get(token: any, notFoundValue?: any): any;
}

export class ReflectiveInjector_ implements ReflectiveInjector {
  private constructionCounter = 0;
  public providers: ResolvedReflectiveProvider[];
  public parent: Injector | null;

  keyIds: number[];
  objs: any[];
  /**
   * Private
   */
  constructor(providers: ResolvedReflectiveProvider[], parent?: Injector) {
    this.providers = providers;
    this.parent = parent || null;

    const len = providers.length;

    this.keyIds = new Array(len);
    this.objs = new Array(len);

    for (let i = 0; i < len; i++) {
      this.keyIds[i] = providers[i].key.id;
      this.objs[i] = UNDEFINED;
    }
  }

  get(token: any, notFoundValue: any = THROW_IF_NOT_FOUND): any {
    return this.getByKey(ReflectiveKey.get(token), null, notFoundValue);
  }

  resolveAndCreateChild(providers: Provider[]): ReflectiveInjector {
    const ResolvedReflectiveProviders = ReflectiveInjector.resolve(providers);
    return this.createChildFromResolved(ResolvedReflectiveProviders);
  }

  createChildFromResolved(
    providers: ResolvedReflectiveProvider[]
  ): ReflectiveInjector {
    const inj = new ReflectiveInjector_(providers);
    inj.parent = this;
    return inj;
  }

  resolveAndInstantiate(provider: Provider): any {
    return this.instantiateResolved(ReflectiveInjector.resolve([provider])[0]);
  }

  instantiateResolved(provider: ResolvedReflectiveProvider): any {
    return this.instantiateProvider(provider);
  }

  getProviderAtIndex(index: number): ResolvedReflectiveProvider {
    if (index < 0 || index >= this.providers.length) {
      throw outOfBoundsError(index);
    }
    return this.providers[index];
  }

  private new(provider: ResolvedReflectiveProvider): any {
    if (this.constructionCounter++ > this.getMaxNumberOfObjects()) {
      throw cyclicDependencyError(this, provider.key);
    }
    return this.instantiateProvider(provider);
  }

  private getMaxNumberOfObjects(): number {
    return this.objs.length;
  }

  private instantiateProvider(provider: ResolvedReflectiveProvider): any {
    if (provider.multiProvider) {
      const res = new Array(provider.resolvedFactories.length);
      for (let i = 0; i < provider.resolvedFactories.length; ++i) {
        res[i] = this.instantiate(provider, provider.resolvedFactories[i]);
      }
      return res;
    } else {
      return this.instantiate(provider, provider.resolvedFactories[0]);
    }
  }

  private instantiate(
    provider: ResolvedReflectiveProvider,
    ResolvedReflectiveFactory: ResolvedReflectiveFactory
  ): any {
    const factory = ResolvedReflectiveFactory.factory;

    let deps: any[];
    try {
      deps = ResolvedReflectiveFactory.dependencies.map((dep) =>
        this.getByReflectiveDependency(dep)
      );
    } catch (e) {
      if (e.addKey) {
        e.addKey(this, provider.key);
      }
      throw e;
    }

    let obj: any;
    try {
      obj = factory(...deps);
    } catch (e) {
      throw instantiationError(this, e, e.stack, provider.key);
    }

    return obj;
  }

  private getByReflectiveDependency(dep: ReflectiveDependency): any {
    return this.getByKey(
      dep.key,
      dep.visibility,
      dep.optional ? null : THROW_IF_NOT_FOUND
    );
  }

  private getByKey(
    key: ReflectiveKey,
    visibility: Self | SkipSelf | null,
    notFoundValue: any
  ): any {
    if (key === INJECTOR_KEY) {
      return this;
    }

    if (visibility instanceof Self) {
      return this.getByKeySelf(key, notFoundValue);
    } else {
      return this.getByKeyDefault(key, notFoundValue, visibility);
    }
  }

  private getObjByKeyId(keyId: number): any {
    for (let i = 0; i < this.keyIds.length; i++) {
      if (this.keyIds[i] === keyId) {
        if (this.objs[i] === UNDEFINED) {
          this.objs[i] = this.new(this.providers[i]);
        }

        return this.objs[i];
      }
    }

    return UNDEFINED;
  }

  private throwOrNull(key: ReflectiveKey, notFoundValue: any): any {
    if (notFoundValue !== THROW_IF_NOT_FOUND) {
      return notFoundValue;
    } else {
      throw noProviderError(this, key);
    }
  }

  private getByKeySelf(key: ReflectiveKey, notFoundValue: any): any {
    const obj = this.getObjByKeyId(key.id);
    return obj !== UNDEFINED ? obj : this.throwOrNull(key, notFoundValue);
  }

  private getByKeyDefault(
    key: ReflectiveKey,
    notFoundValue: any,
    visibility: Self | SkipSelf | null
  ): any {
    let inj: Injector | null;

    if (visibility instanceof SkipSelf) {
      inj = this.parent;
    } else {
      inj = this;
    }

    while (inj instanceof ReflectiveInjector_) {
      const obj = inj.getObjByKeyId(key.id);
      if (obj !== UNDEFINED) return obj;
      inj = inj.parent;
    }
    if (inj !== null) {
      return inj.get(key.token, notFoundValue);
    } else {
      return this.throwOrNull(key, notFoundValue);
    }
  }

  get displayName(): string {
    const providers = mapProviders(
      this,
      (b: ResolvedReflectiveProvider) => ' "' + b.key.displayName + '" '
    ).join(", ");
    return `ReflectiveInjector(providers: [${providers}])`;
  }

  toString(): string {
    return this.displayName;
  }
}

const INJECTOR_KEY = ReflectiveKey.get(Injector);

function mapProviders(injector: ReflectiveInjector_, fn: Function): any[] {
  const res: any[] = new Array(injector.providers.length);
  for (let i = 0; i < injector.providers.length; ++i) {
    res[i] = fn(injector.getProviderAtIndex(i));
  }
  return res;
}
