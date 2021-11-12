import { Expression, Location } from './ast.js';
import { LibScope, LocalScope, RuntimeType, ShellScope } from './runtime.js';
import { isList, isMap as isImmutableMap, List, Map as ImmutableMap } from 'immutable';
import { dirname, resolve } from 'path';
import { Loader } from './loader.js';
import { doExecute } from './executeUtils.js';

export type NormalFunction = (args: List<RuntimeType>, loc: Location) => RuntimeType;

export const normalFunctionSymbol = Symbol('NormalFunction');

export function markNormal(func: NormalFunction): NormalFunction {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (func as any)[normalFunctionSymbol] = true;
  return func;
}

export function isNormalFunction(obj: unknown): obj is NormalFunction {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/ban-ts-comment
  // @ts-ignore
  return !!obj[normalFunctionSymbol];
}

export class Interpreter {

  constructor(private loader: Loader) {
  }

  evaluate(ex: Expression, scope: LocalScope): RuntimeType {
    switch (ex.kind) {
      case 'noOp':
        return null;
      case 'value':
        return ex.value;
      case 'variable':
        return scope.lookup(ex.name, ex.loc);
      case 'arrayExpression':
        return ex.body.map(it => this.evaluate(it, scope));
      case 'mapExpression':
        return ex.body.toKeyedSeq()
          .mapEntries(([key, value]) => [this.evaluate(key, scope), this.evaluate(value, scope)])
          .toMap();
      case 'if': {
        if (this.evaluate(ex.condition, scope)) {
          return this.evaluate(ex.thenEx, scope);
        } else {
          return this.evaluate(ex.elseEx, scope);
        }
      }
      case 'def': {
        const value = this.evaluate(ex.value, scope);
        scope.define(ex.name, value);
        return value;
      }
      case 'export': {
        const value = this.evaluate(ex.value, scope);
        scope.export(ex.name, value, ex.loc);
        return value;
      }
      case 'import': {
        const moduleScope = scope.moduleScope();
        const env = moduleScope.environment();
        const baseDir = moduleScope instanceof ShellScope ? env.cwd : moduleScope.fileSourceDir;
        const path = this.evaluate(ex.path, scope);

        if (typeof path !== 'string') {
          return ex.path.loc.fail('Expected second parameter of import to be a string');
        }

        const fullPath = resolve(baseDir, path);
        const fullDir = dirname(fullPath);

        const ast = this.loader.loadFile(fullPath);

        const libScope = env.createLib(fullDir);
        const libLocal = libScope.childScope();

        ast.forEach(ex => {
          this.evaluate(ex, libLocal);
        });

        const mode = ex.mode;

        switch (mode.kind) {
          case 'wild':
            libScope.importAll().forEach(([name, value]) => {
              scope.define(name, value);
            });
            break;
          case 'namespaced':
            libScope.importAll().forEach(([name, value]) => {
              scope.define(`${mode.namespace}/${name}`, value);
            });
            break;
          case 'named':
            mode.names.forEach(name => {
              scope.define(name, libScope.import(name, ex.loc));
            });
            break;
        }

        return null;
      }
      case 'fn': {
        return markNormal(rawArgs => {
          const localScope = scope.childScope();

          localScope.let('0', rawArgs);

          rawArgs.map((value, index) => {
            const param = ex.args.get(index) ?? String(index + 1);

            localScope.let(param, value);
          });

          return this.evaluate(ex.body, localScope);
        });
      }
      case 'let': {
        const localScope = scope.childScope();

        ex.args.forEach((valueEx, name) => {
          const value = this.evaluate(valueEx, localScope);
          localScope.let(name, value);
        });

        return this.evaluate(ex.body, localScope);
      }
      case 'cd': {
        const path = this.evaluate(ex.path, scope);

        if (typeof path !== 'string') {
          return ex.path.loc.fail('Expected first argument to cd to be a string');
        }

        const moduleScope = scope.moduleScope();
        const env = moduleScope.environment();
        const basePath = env.cwd;
        env.cwd = resolve(basePath, path);

        if (ex.body !== undefined) {
          try {
            return this.evaluate(ex.body, scope);
          } finally {
            env.cwd = basePath;
          }
        } else {
          if (moduleScope instanceof LibScope) {
            return ex.loc.fail('Cannot use global cd inside a library, only from the shell directly. If you need to cd, wrap those expressions inside a third parameter.');
          } else {
            return null;
          }
        }
      }
      case 'execute': {
        const envScope = scope.moduleScope().environment();
        const {cwd, env} = envScope.environment();

        const path = this.evaluate(ex.path, scope);

        if (typeof path !== 'string') {
          return ex.path.loc.fail('Expected first argument to execute to be a path to the program to run');
        }

        const argumentList = ex.args === undefined ? List() : this.evaluate(ex.args, scope);

        if (!isList(argumentList)) {
          return ex.args!.loc.fail('Expected second argument to execute to be a list of arguments to the program');
        }

        const flagsMap = ex.options === undefined ? ImmutableMap() : this.evaluate(ex.options, scope);

        if (!isImmutableMap(flagsMap)) {
          return ex.options!.loc.fail('Expected third argument to execute to be a map of flags');
        }

        return doExecute(path, argumentList.map(it => String(it)), flagsMap.mapKeys(it => String(it)).map(it => String(it)), ex.loc, cwd, env);
      }
      case 'try': {
        try {
          return this.evaluate(ex.body, scope);
        } catch (err) {
          if (err instanceof Error) {

            if (ex.catchEx.kind === 'noOp') {
              throw err;
            }

            const errorMap = ImmutableMap<string, RuntimeType>({
              message: err.message ?? null,
              stack: err.stack ?? null,
              name: err.name ?? null
            });

            const localScope = scope.childScope();
            localScope.let(ex.catchName, errorMap);
            return this.evaluate(ex.catchEx, localScope);
          } else {
            throw err;
          }
        } finally {
          this.evaluate(ex.finallyEx, scope);
        }
      }
      case 'sExpression': {
        const func = this.evaluate(ex.head, scope);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (isNormalFunction(func)) {
          const args = ex.body.map(it => this.evaluate(it, scope));
          return func(args, ex.loc);
        }

        return ex.head.loc.fail(`Not callable. Type is ${typeof func}`);
      }
    }
  }
}



