import { GlobalScope, RuntimeType } from '../runtime.js';
import { markNormal, NormalFunction } from '../interpreter.js';
import { isCollection, List, Map as ImmutableMap } from 'immutable';
import { Location } from '../ast.js';
import { initShellLib } from './shellLib.js';
import { initListLib } from './listLib.js';
import { initParseLib } from './parseLib.js';
import { initMapLib } from './mapLib.js';
import { initMathLib } from './mathLib.js';
import { initSeqLib } from './seqLib.js';
import { initMetaLib } from './metaLib.js';
import { initStringLib } from './stringLib.js';

export class GlobalScopeBuilder {
  private dict = new Map<string, RuntimeType>();

  addFunction(name: string, func: NormalFunction): void {
    markNormal(func);
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
  builder.addFunction('and', doAnd);
  builder.addFunction('or', orMacro);
  builder.addFunction('==', equals);
  builder.addFunction('!=', notEquals);
  builder.addFunction('>', greaterThan);
  builder.addFunction('>=', greaterThanEqualTo)
  builder.addFunction('<', lessThan);
  builder.addFunction('<=', lessThanEqualTo);

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

function stringConcat(args: List<RuntimeType>): RuntimeType {
  return args.join('');
}

function doAnd(args: List<RuntimeType>): RuntimeType {
  return args.reduce((prev: boolean, next) => {
    return prev && !!next
  }, true);
}

function orMacro(args: List<RuntimeType>): RuntimeType {
  return args.reduce((prev: boolean, next) => {
    return prev || !!next;
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

function doFunction(args: List<RuntimeType>, loc: Location): RuntimeType {
  return args.last() ?? null;
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
