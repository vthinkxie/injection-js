/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Type } from "../interface/type";

export interface PlatformReflectionCapabilities {
  factory(type: Type<any>): Function;
  parameters(type: Type<any>): any[][];
  annotations(type: Type<any>): any[];
  propMetadata(typeOrFunc: Type<any>): { [key: string]: any[] };
}
