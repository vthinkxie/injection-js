/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Type } from "../interface/type";
import { PlatformReflectionCapabilities } from "./platform_reflection_capabilities";
import { ReflectorReader } from "./reflector_reader";

export { PlatformReflectionCapabilities } from "./platform_reflection_capabilities";

/**
 * Provides access to reflection data about symbols. Used internally by Angular
 * to power dependency injection and compilation.
 */
export class Reflector extends ReflectorReader {
  constructor(public reflectionCapabilities: PlatformReflectionCapabilities) {
    super();
  }

  factory(type: Type<any>): Function {
    return this.reflectionCapabilities.factory(type);
  }

  parameters(typeOrFunc: Type<any>): any[][] {
    return this.reflectionCapabilities.parameters(typeOrFunc);
  }

  annotations(typeOrFunc: Type<any>): any[] {
    return this.reflectionCapabilities.annotations(typeOrFunc);
  }

  propMetadata(typeOrFunc: Type<any>): { [key: string]: any[] } {
    return this.reflectionCapabilities.propMetadata(typeOrFunc);
  }
}
