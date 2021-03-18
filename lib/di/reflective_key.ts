/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { resolveForwardRef } from "./forward_ref";
import { stringify } from "../util/stringify";

/**
 * A unique object used for retrieving items from the {@link ReflectiveInjector}.
 *
 * Keys have:
 * - a system-wide unique `id`.
 * - a `token`.
 *
 * `Key` is used internally by {@link ReflectiveInjector} because its system-wide unique `id` allows
 * the
 * injector to store created objects in a more efficient way.
 *
 * `Key` should not be created directly. {@link ReflectiveInjector} creates keys automatically when
 * resolving
 * providers.
 * @experimental
 */
export class ReflectiveKey {
  public readonly displayName: string;
  /**
   * Private
   */
  constructor(public token: any, public id: number) {
    if (!token) {
      throw new Error("Token must be defined!");
    }
    this.displayName = stringify(this.token);
  }

  /**
   * Retrieves a `Key` for a token.
   */
  static get(token: any): ReflectiveKey {
    return globalKeyRegistry.get(resolveForwardRef(token));
  }

  /**
   * @returns the number of keys registered in the system.
   */
  static get numberOfKeys(): number {
    return globalKeyRegistry.numberOfKeys;
  }
}

/**
 * @internal
 */
export class KeyRegistry {
  private allKeys = new Map<any, ReflectiveKey>();

  get(token: any): ReflectiveKey {
    if (token instanceof ReflectiveKey) {
      return token;
    } else if (this.allKeys.has(token)) {
      return this.allKeys.get(token)!;
    } else {
      const newKey = new ReflectiveKey(token, ReflectiveKey.numberOfKeys);
      this.allKeys.set(token, newKey);
      return newKey;
    }
  }

  get numberOfKeys(): number {
    return this.allKeys.size;
  }
}

const globalKeyRegistry = new KeyRegistry();
