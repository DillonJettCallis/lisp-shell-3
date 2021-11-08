import { GlobalScope, LocalScope, RuntimeType } from '../runtime';
import {
  EnvFunction,
  Interpreter,
  isNormalFunction,
  MacroFunction,
  markEnv,
  markMacro,
  markNormal,
  NormalFunction
} from '../interpreter';
import { isCollection, List, Map as ImmutableMap } from 'immutable';
import { Expression, ListExpression, Location, VariableExpression } from '../ast';
import { initShellLib } from './shellLib';
import { initListLib } from './listLib';
import { initParseLib } from './parseLib';
import { initMapLib } from './mapLib';
import { initMathLib } from './mathLib';
import { initSeqLib } from './seqLib';
import { initMetaLib } from './metaLib';
import { initStringLib } from './stringLib';

export class GlobalScopeBuilder {
  private dict = new Map<string, RuntimeType>();

  addFunction(name: string, func: NormalFunction): void {
    markNormal(func);
    this.dict.set(name, func);
  }

  addEnvFunction(name: string, func: EnvFunction): void {
    markEnv(func);
    this.dict.set(name, func);
  }

  addMacroFunction(name: string, func: MacroFunction): void {
    markMacro(func);
    this.dict.set(name, func);
  }

  build(): GlobalScope {
    return new GlobalScope(ImmutableMap(this.dict));
  }
}

export function initCoreLib(): GlobalScope {
  const builder = new GlobalScopeBuilder();

  builder.addFunction('do', doFunction);
  builder.addFunction('&', stringConcat);

  builder.addFunction('not', not);
  builder.addMacroFunction('and', andMacro);
  builder.addMacroFunction('or', orMacro);
  builder.addFunction('==', equals);
  builder.addFunction('!=', notEquals);
  builder.addFunction('>', greaterThan);
  builder.addFunction('>=', greaterThanEqualTo)
  builder.addFunction('<', lessThan);
  builder.addFunction('<=', lessThanEqualTo);

  builder.addMacroFunction('if', ifMacro);
  builder.addMacroFunction('def', defMacro);
  builder.addMacroFunction('fn', fnMacro);
  builder.addMacroFunction('let', letMacro);
  builder.addMacroFunction('export', doExport);
  builder.addFunction('try', doTry);
  builder.addFunction('throw', doThrow);
  builder.addFunction('echo', doEcho);

  initMathLib(builder);
  initStringLib(builder);
  initShellLib(builder);
  initParseLib(builder);
  initListLib(builder);
  initSeqLib(builder);
  initMapLib(builder);
  initMetaLib(builder);

  return builder.build();
}

function stringConcat(args: List<RuntimeType>, loc: Location): RuntimeType {
  return args.join('');
}

function andMacro(args: List<Expression>, loc: Location, interpreter: Interpreter, scope: LocalScope): RuntimeType {
  return args.reduce((prev: boolean, next) => {
    return prev && !!interpreter.evaluate(next, scope);
  }, true);
}

function orMacro(args: List<Expression>, loc: Location, interpreter: Interpreter, scope: LocalScope): RuntimeType {
  return args.reduce((prev: boolean, next) => {
    return prev || !!interpreter.evaluate(next, scope);
  }, false);
}

function not(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('not function expects exactly one argument');
  }

  return !args.first();
}

function equals(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('== function expects exactly two arguments');
  }

  const [first, second] = args;

  if (isCollection(first)) {
    return first.equals(second);
  } else {
    return first === second;
  }
}

function notEquals(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('!= function expects exactly two arguments');
  }

  const [first, second] = args;

  if (isCollection(first)) {
    return !first.equals(second);
  } else {
    return first !== second;
  }
}

function greaterThan(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('> function expects exactly two arguments');
  }

  const [first, second] = args;

  return (first ?? 0) > (second ?? 0);
}

function greaterThanEqualTo(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('>= function expects exactly two arguments');
  }

  const [first, second] = args;

  return (first ?? 0) >= (second ?? 0);
}

function lessThan(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('< function expects exactly two arguments');
  }

  const [first, second] = args;

  return (first ?? 0) < (second ?? 0);
}

function lessThanEqualTo(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('<= function expects exactly two arguments');
  }

  const [first, second] = args;

  return (first ?? 0) <= (second ?? 0);
}

function ifMacro(args: List<Expression>, loc: Location, interpreter: Interpreter, scope: LocalScope): RuntimeType {
  if (args.size < 2 || args.size > 3) {
    loc.fail('if function must have at two or three arguments');
  }

  const [conditionEx, thenEx, elseEx] = args;
  const condition = interpreter.evaluate(conditionEx, scope);

  if (condition) {
    return interpreter.evaluate(thenEx, scope);
  } else {
    if (elseEx === undefined) {
      return null;
    } else {
      return interpreter.evaluate(elseEx, scope);
    }
  }
}

function defMacro(args: List<Expression>, loc: Location, interpreter: Interpreter, scope: LocalScope): RuntimeType {
  // (def $name value)

  if (args.size !== 2) {
    loc.fail('def function must have exactly two arguments');
  }

  const [nameEx, valueEx] = args;

  if (nameEx.kind !== 'variable') {
    return nameEx.loc.fail(`Expected variable but found ${nameEx.kind}`);
  }

  const name = nameEx.name;
  const value = interpreter.evaluate(valueEx, scope);

  scope.define(name, value);
  return null;
}

function fnMacro(args: List<Expression>, loc: Location, interpreter: Interpreter, scope: LocalScope): RuntimeType {
  // (fn [$args] body)

  if (args.size !== 2) {
    loc.fail('fn function must have exactly two arguments');
  }

  const [paramsEx, body] = args;

  if (paramsEx.kind !== 'arrayExpression') {
    return paramsEx.loc.fail(`Expected array of variables but found ${paramsEx.kind}`);
  }

  const params = paramsEx.body.map(param => {
    if (param.kind !== 'variable') {
      return param.loc.fail(`Expected variable but found ${param.kind}`);
    } else {
      return param.name;
    }
  });

  const func: NormalFunction = rawArgs => {
    const localScope = scope.childScope();

    localScope.let('0', rawArgs);

    rawArgs.map((value, index) => {
      const param = params.get(index) ?? String(index + 1);

      localScope.let(param, value);
    });

    return interpreter.evaluate(body, localScope);
  };

  markNormal(func);
  return func;
}

function letMacro(args: List<Expression>, loc: Location, interpreter: Interpreter, scope: LocalScope): RuntimeType {
  // (let [$arg value] body)
  // (let [[$arg value] [$second secondValue]] body)
  const childScope = scope.childScope();

  if (args.size !== 2) {
    loc.fail('let function expects exactly two arguments');
  }

  const [rawArgDefs, body] = args;

  if (!(rawArgDefs instanceof ListExpression)) {
    return rawArgDefs.loc.fail('Expected a list of either a variable and value, or a list of variable value lists');
  }

  if (rawArgDefs.body.isEmpty()) {
    return rawArgDefs.loc.fail('let argument list cannot be empty');
  }

  const sample = rawArgDefs.body.first()!;

  const pairs = sample instanceof ListExpression
      ? rawArgDefs.body
      : sample instanceof VariableExpression
        ? List([rawArgDefs])
        : sample.loc.fail('Expected first argument to let to be either a list of variable value pairs or a single pair');

  pairs.forEach(pair => {
    if (!(pair instanceof ListExpression)) {
      return pair.loc.fail('Expected first argument to let to be either a list of variable value pairs or a single pair');
    }

    if (pair.body.size !== 2) {
      return pair.loc.fail('Expected a pair of a variable and a value');
    }

    const [varEx, bodyEx] = pair.body;

    if (!(varEx instanceof VariableExpression)) {
      return varEx.loc.fail(`Expected a variable but found a ${varEx.kind}`);
    }

    const varName = varEx.name;
    const value = interpreter.evaluate(bodyEx, childScope);

    childScope.let(varName, value);
  });

  return interpreter.evaluate(body, childScope);
}

function doFunction(args: List<RuntimeType>, loc: Location): RuntimeType {
  return args.last() ?? null;
}

/**
 * (export $x 5)
 *
 * short hand syntax is desugared into this one case
 */
function doExport(args: List<Expression>, loc: Location, interpreter: Interpreter, scope: LocalScope): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('Expected exactly two arguments to export');
  }

  const [nameEx, valueEx] = args;

  if (nameEx.kind !== 'variable') {
    return nameEx.loc.fail('Expected first argument to export to be a variable');
  }

  const name = nameEx.name;
  const value = interpreter.evaluate(valueEx, scope);

  scope.export(name, value, loc);

  return null;
}

// (try (\ action) (\ catch) (\ finally))
function doTry(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 3) {
    return loc.fail('Expected exactly three arguments to try');
  }

  const [actionFunc, catchFunc, finallyFunc] = args;

  if (!isNormalFunction(actionFunc)) {
    return loc.fail('Expected first argument to try to be a function');
  }

  if (!isNormalFunction(catchFunc)) {
    return loc.fail('Expected second argument to try to be a function');
  }

  if (!isNormalFunction(finallyFunc)) {
    return loc.fail('Expected third argument to try to be a function');
  }

  const emptyList = List([]);

  try {
    return actionFunc(emptyList, loc);
  } catch (err) {
    if (err instanceof Error) {
      return catchFunc(List([ImmutableMap({message: err.message ?? null, stack: err.stack ?? null, name: err.name ?? null})]), loc);
    } else {
      throw err;
    }
  } finally {
    finallyFunc(emptyList, loc);
  }
}

function doThrow(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('Expected exactly one arguments to throw');
  }

  throw new Error(String(args.first()));
}

function doEcho(args: List<RuntimeType>, loc: Location): RuntimeType {
  console.log(...args.toJS());
  return null;
}
