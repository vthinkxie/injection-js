[![Build Status](https://travis-ci.org/mgechev/injection-js.svg?branch=master)](https://travis-ci.org/mgechev/injection-js) ![Downloads](https://img.shields.io/npm/dm/injection-js.svg)

# Dependency Injection

Dependency injection library for JavaScript and TypeScript in **5.2K**. It is an extraction of the Angular's dependency injection which means that it's feature complete, fast, reliable and well tested.

# Why not Angular version 5 and above?

Angular version 5 deprecated the `ReflectiveInjector` API and introduced `StaticInjector`. In short, the dependency injection in the newest versions of Angular will happen entirely compile-time so reflection will not be necessary.

However, if you want to use dependency injection in your Node.js, Vue, React, Vanilla JS, TypeScript, etc. application you won't be able to take advantage of `StaticInjector` the way that Angular will because your application won't be compatible with Angular compiler.

This means that **if you need dependency injection outside of Angular `@angular/core` is not an option. In such case, use `injection-js` for fast, small, reliable, high-quality, well-designed and well tested solution.**

# How to use?

```sh
$ npm i injection-js
# OR
$ yarn add injection-js
```

> **Note:**
>
> For ES5 `Class` syntax and TypeScript you need a polyfill for the [Reflect API](http://www.ecma-international.org/ecma-262/6.0/#sec-reflection).
> You can use:
>
> - [reflection](https://www.npmjs.com/package/@abraham/reflection) (only 3kb 🔥)
> - [reflect-metadata](https://www.npmjs.com/package/reflect-metadata)
> - [core-js (`core-js/es7/reflect`)](https://www.npmjs.com/package/core-js)
>
> Also for TypeScript you will need to enable `experimentalDecorators` and `emitDecoratorMetadata` flags within your `tsconfig.json`

## Usage

```ts
import 'reflect-metadata';
import { ReflectiveInjector, Injectable, Injector } from 'injection-js';

class Http {}

@Injectable()
class Service {
  constructor(private http: Http) {}
}

@Injectable()
class Service2 {
  constructor(private injector: Injector) {}

  getService(): void {
    console.log(this.injector.get(Service) instanceof Service);
  }

  createChildInjector(): void {
    const childInjector = ReflectiveInjector.resolveAndCreate([Service], this.injector);
  }
}

const injector = ReflectiveInjector.resolveAndCreate([Service, Http]);

console.log(injector.get(Service) instanceof Service);
```

# API

For full documentation check Angular DI docs:

- [Dependency Injection](https://v4.angular.io/guide/dependency-injection)
- [Dependency Injection in action](https://v4.angular.io/guide/dependency-injection-in-action)

# License

MIT
