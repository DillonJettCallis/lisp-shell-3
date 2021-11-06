import { Expression, Location } from './ast';
import { LocalScope, RuntimeType } from './runtime';
import { List, Map as ImmutableMap } from 'immutable';

export type MacroFunction = (args: List<Expression>, loc: Location, interpreter: Interpreter, scope: LocalScope) => RuntimeType;
export type NormalFunction = (args: List<RuntimeType>, loc: Location) => RuntimeType;

export const normalFunctionSymbol = Symbol('NormalFunction');
export const macroFunctionSymbol = Symbol('MacroFunction');

export function markNormal(func: NormalFunction): NormalFunction {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (func as any)[normalFunctionSymbol] = true;
  return func;
}

export function markMacro(func: MacroFunction): MacroFunction {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (func as any)[macroFunctionSymbol] = true;
  return func;
}

export function isNormalFunction(obj: unknown): obj is NormalFunction {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/ban-ts-comment
  // @ts-ignore
  return !!obj[normalFunctionSymbol];
}

export function isMacroFunction(obj: unknown): obj is MacroFunction {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/ban-ts-comment
  // @ts-ignore
  return !!obj[macroFunctionSymbol];
}

export class Interpreter {

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
        return ImmutableMap(ex.body.map(([key, value]) => [this.evaluate(key, scope), this.evaluate(value, scope)]));
      case 'sExpression': {
        const func = this.evaluate(ex.head, scope);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (isNormalFunction(func)) {
          const args = ex.body.map(it => this.evaluate(it, scope));
          return func(args, ex.loc);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (isMacroFunction(func)) {
          return func(ex.body, ex.loc, this, scope);
        }

        return ex.head.loc.fail(`Not callable. Type is ${typeof func}`);
      }
    }
  }
}



