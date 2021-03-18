/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Reflector } from "../../lib/reflection/reflector";
import {
  isDelegateCtor,
  ReflectionCapabilities,
} from "../../lib/reflection/reflection_capabilities";
import { makeDecorator, makeParamDecorator } from "../../lib/util/decorators";

import "reflect-metadata";

interface ClassDecoratorFactory {
  (data: ClassDecorator): any;
  new (data: ClassDecorator): ClassDecorator;
}

interface ClassDecorator {
  value: any;
}

/** @Annotation */ const ClassDecorator = <ClassDecoratorFactory>(
  makeDecorator("ClassDecorator", (data: any) => data)
);
/** @Annotation */ const ParamDecorator = makeParamDecorator(
  "ParamDecorator",
  (value: any) => ({ value })
);

class AType {
  constructor(public value: any) {}
}

@ClassDecorator({ value: "class" })
class ClassWithDecorators {
  a: AType;
  b: AType;

  constructor(@ParamDecorator("a") a: AType, @ParamDecorator("b") b: AType) {
    this.a = a;
    this.b = b;
  }
}

class ClassWithoutDecorators {
  constructor(a: any, b: any) {}
}
{
  describe("Reflector", () => {
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector(new ReflectionCapabilities());
    });

    describe("factory", () => {
      it("should create a factory for the given type", () => {
        class TestObj {
          constructor(public a: any, public b: any) {}
        }
        const obj = reflector.factory(TestObj)(1, 2);
        expect(obj.a).toEqual(1);
        expect(obj.b).toEqual(2);
      });
    });
    describe("parameters", () => {
      it("should return an array of parameters for a type", () => {
        const p = reflector.parameters(ClassWithDecorators);
        expect(p).toEqual([
          [AType, new ParamDecorator("a")],
          [AType, new ParamDecorator("b")],
        ]);
      });

      it("should work for a class without annotations", () => {
        const p = reflector.parameters(ClassWithoutDecorators);
        expect(p.length).toEqual(2);
      });
    });

    describe("isDelegateCtor", () => {
      it("should support ES5 compiled classes", () => {
        // These classes will be compiled to ES5 code so their stringified form
        // below will contain ES5 constructor functions rather than native classes.
        class Parent {}

        class ChildNoCtor extends Parent {}
        class ChildWithCtor extends Parent {
          constructor() {
            super();
          }
        }
        class ChildNoCtorPrivateProps extends Parent {
          private x = 10;
        }

        expect(isDelegateCtor(ChildNoCtor.toString())).toBe(true);
        expect(isDelegateCtor(ChildNoCtorPrivateProps.toString())).toBe(true);
        expect(isDelegateCtor(ChildWithCtor.toString())).toBe(false);
      });

      // See: https://github.com/angular/angular/issues/38453
      it("should support ES2015 downleveled classes", () => {
        class Parent {}

        class ChildNoCtor extends Parent {}
        class ChildWithCtor extends Parent {
          constructor() {
            super();
          }
        }
        class ChildNoCtorPrivateProps extends Parent {
          x = 10;
        }
        expect(isDelegateCtor(ChildNoCtor.toString())).toBe(true);
        expect(isDelegateCtor(ChildNoCtorPrivateProps.toString())).toBe(true);
        expect(isDelegateCtor(ChildWithCtor.toString())).toBe(false);
      });

      it("should support ES2015 classes when minified", () => {
        // These classes are ES2015 in minified form
        const ChildNoCtorMinified = "class ChildNoCtor extends Parent{}";
        const ChildWithCtorMinified =
          "class ChildWithCtor extends Parent{constructor(){super()}}";
        const ChildNoCtorPrivatePropsMinified =
          "class ChildNoCtorPrivateProps extends Parent{constructor(){super(...arguments);this.x=10}}";

        expect(isDelegateCtor(ChildNoCtorMinified)).toBe(true);
        expect(isDelegateCtor(ChildNoCtorPrivatePropsMinified)).toBe(true);
        expect(isDelegateCtor(ChildWithCtorMinified)).toBe(false);
      });

      it("should not throw when no prototype on type", () => {
        // Cannot test arrow function here due to the compilation
        const dummyArrowFn = function () {};
        Object.defineProperty(dummyArrowFn, "prototype", { value: undefined });
        expect(() => reflector.annotations(dummyArrowFn as any)).not.toThrow();
      });

      it("should support native class", () => {
        // These classes are defined as strings unlike the tests above because otherwise
        // the compiler (of these tests) will convert them to ES5 constructor function
        // style classes.
        const ChildNoCtor = `class ChildNoCtor extends Parent {}\n`;
        const ChildWithCtor =
          `class ChildWithCtor extends Parent {\n` +
          `  constructor() { super(); }` +
          `}\n`;
        const ChildNoCtorComplexBase = `class ChildNoCtor extends Parent['foo'].bar(baz) {}\n`;
        const ChildWithCtorComplexBase =
          `class ChildWithCtor extends Parent['foo'].bar(baz) {\n` +
          `  constructor() { super(); }` +
          `}\n`;
        const ChildNoCtorPrivateProps =
          `class ChildNoCtorPrivateProps extends Parent {\n` +
          `  constructor() {\n` +
          // Note that the instance property causes a pass-through constructor to be synthesized
          `    super(...arguments);\n` +
          `    this.x = 10;\n` +
          `  }\n` +
          `}\n`;

        expect(isDelegateCtor(ChildNoCtor)).toBe(true);
        expect(isDelegateCtor(ChildNoCtorPrivateProps)).toBe(true);
        expect(isDelegateCtor(ChildWithCtor)).toBe(false);
        expect(isDelegateCtor(ChildNoCtorComplexBase)).toBe(true);
        expect(isDelegateCtor(ChildWithCtorComplexBase)).toBe(false);
      });

      it("should properly handle all class forms", () => {
        const ctor = (str: string) => expect(isDelegateCtor(str)).toBe(false);
        const noCtor = (str: string) => expect(isDelegateCtor(str)).toBe(true);

        ctor(`class Bar extends Foo {constructor(){}}`);
        ctor(`class Bar extends Foo { constructor ( ) {} }`);
        ctor(`class Bar extends Foo { other(){}; constructor(){} }`);

        noCtor(`class extends Foo{}`);
        noCtor(`class extends Foo {}`);
        noCtor(`class Bar extends Foo {}`);
        noCtor(`class $Bar1_ extends $Fo0_ {}`);
        noCtor(`class Bar extends Foo { other(){} }`);
      });
    });

    describe("inheritance with decorators", () => {
      it("should inherit annotations", () => {
        @ClassDecorator({ value: "parent" })
        class Parent {}

        @ClassDecorator({ value: "child" })
        class Child extends Parent {}

        class ChildNoDecorators extends Parent {}

        class NoDecorators {}

        // Check that metadata for Parent was not changed!
        expect(reflector.annotations(Parent)).toEqual([
          new ClassDecorator({ value: "parent" }),
        ]);

        expect(reflector.annotations(Child)).toEqual([
          new ClassDecorator({ value: "parent" }),
          new ClassDecorator({ value: "child" }),
        ]);

        expect(reflector.annotations(ChildNoDecorators)).toEqual([
          new ClassDecorator({ value: "parent" }),
        ]);

        expect(reflector.annotations(NoDecorators)).toEqual([]);
        expect(reflector.annotations(<any>{})).toEqual([]);
        expect(reflector.annotations(<any>1)).toEqual([]);
        expect(reflector.annotations(null!)).toEqual([]);
      });

      it("should inherit parameters", () => {
        class A {}
        class B {}
        class C {}

        // Note: We need the class decorator as well,
        // as otherwise TS won't capture the ctor arguments!
        @ClassDecorator({ value: "parent" })
        class Parent {
          constructor(@ParamDecorator("a") a: A, @ParamDecorator("b") b: B) {}
        }

        class Child extends Parent {}

        @ClassDecorator({ value: "child" })
        class ChildWithDecorator extends Parent {}

        @ClassDecorator({ value: "child" })
        class ChildWithDecoratorAndProps extends Parent {
          private x = 10;
        }

        // Note: We need the class decorator as well,
        // as otherwise TS won't capture the ctor arguments!
        @ClassDecorator({ value: "child" })
        class ChildWithCtor extends Parent {
          constructor(@ParamDecorator("c") c: C) {
            super(null!, null!);
          }
        }

        class ChildWithCtorNoDecorator extends Parent {
          constructor(a: any, b: any, c: any) {
            super(null!, null!);
          }
        }

        class NoDecorators {}

        // Check that metadata for Parent was not changed!
        expect(reflector.parameters(Parent)).toEqual([
          [A, new ParamDecorator("a")],
          [B, new ParamDecorator("b")],
        ]);

        expect(reflector.parameters(Child)).toEqual([
          [A, new ParamDecorator("a")],
          [B, new ParamDecorator("b")],
        ]);

        expect(reflector.parameters(ChildWithDecorator)).toEqual([
          [A, new ParamDecorator("a")],
          [B, new ParamDecorator("b")],
        ]);

        expect(reflector.parameters(ChildWithDecoratorAndProps)).toEqual([
          [A, new ParamDecorator("a")],
          [B, new ParamDecorator("b")],
        ]);

        expect(reflector.parameters(ChildWithCtor)).toEqual([
          [C, new ParamDecorator("c")],
        ]);

        // If we have no decorator, we don't get metadata about the ctor params.
        // But we should still get an array of the right length based on function.length.
        expect(reflector.parameters(ChildWithCtorNoDecorator)).toEqual([
          undefined,
          undefined,
          undefined,
        ] as any[]); // TODO: Review use of `any` here (#19904)

        expect(reflector.parameters(NoDecorators)).toEqual([]);
        expect(reflector.parameters(<any>{})).toEqual([]);
        expect(reflector.parameters(<any>1)).toEqual([]);
        expect(reflector.parameters(null!)).toEqual([]);
      });
    });
  });
}
