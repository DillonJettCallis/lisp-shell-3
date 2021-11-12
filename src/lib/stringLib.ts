import { GlobalScopeBuilder } from './coreLib.js';
import { RuntimeType } from '../runtime.js';
import { List } from 'immutable';
import { Location } from '../ast.js';

export function initStringLib(builder: GlobalScopeBuilder) {
  builder.addFunction('string/size', stringSize);
  builder.addFunction('string/contains', doContains);
  builder.addFunction('string/startsWith', doStartsWith);
  builder.addFunction('string/trim', doTrim);
  builder.addFunction('string/substringAfter', doSubstringAfter);
}

function stringSize(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('string/size expected exactly one arguments, a string');
  }

  const list = args.first();

  if (typeof list !== 'string') {
    return loc.fail('string/size expected first argument to be a string');
  }

  return list.length;
}

function doContains(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('string/contains expects exactly two arguments');
  }

  const [haystack, needle] = args;

  if (typeof haystack !== 'string') {
    return loc.fail('Expected first argument to string/contains to be a string');
  }

  if (typeof needle !== 'string') {
    return loc.fail('Expected second argument to string/contains to be a string');
  }

  return haystack.includes(needle);
}

function doStartsWith(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('string/startsWith expects exactly two arguments');
  }

  const [haystack, needle] = args;

  if (typeof haystack !== 'string') {
    return loc.fail('Expected first argument to string/startsWith to be a string');
  }

  if (typeof needle !== 'string') {
    return loc.fail('Expected second argument to string/startsWith to be a string');
  }

  return haystack.startsWith(needle);
}

function doTrim(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('string/trim expects exactly one arguments');
  }

  const [base] = args;

  if (typeof base !== 'string') {
    return loc.fail('Expected first argument to string/trim to be a string');
  }

  return base.trim();
}

function doSubstringAfter(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('string/substringAfter expects exactly two arguments');
  }

  const [haystack, needle] = args;

  if (typeof haystack !== 'string') {
    return loc.fail('Expected first argument to string/substringAfter to be a string');
  }

  if (typeof needle !== 'string') {
    return loc.fail('Expected second argument to string/substringAfter to be a string');
  }

  const index = haystack.indexOf(needle);

  if (index === -1) {
    return haystack;
  } else {
    return haystack.substring(index + 1);
  }
}


