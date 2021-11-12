import { GlobalScopeBuilder } from './coreLib.js';
import { List } from 'immutable';
import { RuntimeType } from '../runtime.js';
import { Location } from '../ast.js';

export function initMathLib(builder: GlobalScopeBuilder): void {
  builder.addFunction('+', add);
  builder.addFunction('*', mul);
  builder.addFunction('-', sub);
  builder.addFunction('/', div);
  builder.addFunction('neg', neg);
}

function add(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('Expected exactly two arguments to math/add');
  }

  const [first, second] = args;

  if (typeof first !== 'number') {
    return loc.fail('Expected first argument to math/add to be a number');
  }

  if (typeof second !== 'number') {
    return loc.fail('Expected second argument to math/add to be a number');
  }

  return first + second;
}


function mul(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('Expected exactly two arguments to math/mul');
  }

  const [first, second] = args;

  if (typeof first !== 'number') {
    return loc.fail('Expected first argument to math/mul to be a number');
  }

  if (typeof second !== 'number') {
    return loc.fail('Expected second argument to math/mul to be a number');
  }

  return first * second;
}


function neg(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('Expected exactly one argument to math/neg');
  }

  const raw = args.first();

  if (typeof raw !== 'number') {
    return loc.fail('Expected first argument to math/neg to be a number');
  }

  return -raw;
}

function sub(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('Expected exactly two arguments to math/sub');
  }

  const [first, second] = args;

  if (typeof first !== 'number') {
    return loc.fail('Expected first argument to math/sub to be a number');
  }

  if (typeof second !== 'number') {
    return loc.fail('Expected second argument to math/sub to be a number');
  }

  return first - second;
}

function div(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('Expected exactly two arguments to math/div');
  }

  const [first, second] = args;

  if (typeof first !== 'number') {
    return loc.fail('Expected first argument to math/div to be a number');
  }

  if (typeof second !== 'number') {
    return loc.fail('Expected second argument to math/div to be a number');
  }

  return first / second;
}
