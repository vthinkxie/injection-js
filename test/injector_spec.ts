/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Injector } from "../lib";

class SomeToken {}

describe("Injector.NULL", () => {
  it("should throw if no arg is given", () => {
    expect(() => Injector.NULL.get(SomeToken)).toThrowError(
      "No provider for SomeToken!"
    );
  });

  it("should throw if THROW_IF_NOT_FOUND is given", () => {
    expect(() =>
      Injector.NULL.get(SomeToken, Injector.THROW_IF_NOT_FOUND)
    ).toThrowError("No provider for SomeToken!");
  });

  it("should return the default value", () => {
    expect(Injector.NULL.get(SomeToken, "notFound")).toEqual("notFound");
  });
});
