/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @module
 * @description
 * The `di` module provides dependency injection container services.
 */

export * from "./di/index";

export { makeDecorator, makeParamDecorator } from "./util/decorators";
export { resolveDependencies } from "./util/resolve_dependencies";
