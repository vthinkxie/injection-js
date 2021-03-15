import { Injector } from "../injector";

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export function isPresent<T>(obj: T): obj is NonNullable<T> {
  return obj != null;
}

export abstract class DebugContext {
  // We don't really need this
  // abstract get view(): ViewData;
  abstract get nodeIndex(): number | null;
  abstract get injector(): Injector;
  abstract get component(): any;
  abstract get providerTokens(): any[];
  abstract get references(): { [key: string]: any };
  abstract get context(): any;
  abstract get componentRenderElement(): any;
  abstract get renderNode(): any;
  abstract logError(console: Console, ...values: any[]): void;
}
