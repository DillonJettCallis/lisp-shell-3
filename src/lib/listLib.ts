import { GlobalScopeBuilder } from './coreLib';
import { isList, List, Range } from 'immutable';
import { RuntimeType } from '../runtime';
import { Location } from '../ast';
import { isNormalFunction } from '../interpreter';

export function initListLib(builder: GlobalScopeBuilder): void {
  builder.addFunction('list/size', listSize);
  builder.addFunction('list/get', listGet);
  builder.addFunction('list/set', listSet);
  builder.addFunction('list/map', listMap);
  builder.addFunction('list/flatMap', listFlatMap);
  builder.addFunction('list/filter', listFilter);
  builder.addFunction('list/fold', listFold);
  builder.addFunction('list/range', listRange);
  builder.addFunction('list/take', listTake);
  builder.addFunction('list/drop', listDrop);
}

function listSize(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('list/size expected exactly one arguments, a list');
  }

  const list = args.first();

  if (!isList(list)) {
    return loc.fail('list/size expected first argument to be a list');
  }

  return list.size;
}

function listGet(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('list/get expected exactly two arguments, a list and an index');
  }

  const [list, index] = args;

  if (!isList(list)) {
    return loc.fail('list/get expected first argument to be a list');
  }

  if (typeof index !== 'number') {
    return loc.fail('list/get expected second argument to be a number');
  }

  return list.get(index) ?? null;
}

function listSet(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 3) {
    return loc.fail('list/set expected exactly three arguments, a list, an index and a value');
  }

  const [list, index, value] = args;

  if (!isList(list)) {
    return loc.fail('list/set expected first argument to be a list');
  }

  if (typeof index !== 'number') {
    return loc.fail('list/set expected second argument to be a number');
  }

  return list.set(index, value);
}

function listRange(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('list/range expected exactly two arguments, a min and a max');
  }

  const [min, max] = args;

  if (typeof min !== 'number') {
    return loc.fail('Expected first argument of list/range to be a number');
  }

  if (typeof max !== 'number') {
    return loc.fail('Expected second argument of list/range to be a number');
  }

  if (min > max) {
    return List([]);
  }

  return Range(min, max).toList();
}

// (list/map $arr $function)
function listMap(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('list/map expected exactly two arguments, a list and a function');
  }

  const [list, func] = args;

  if (!isList(list)) {
    return loc.fail('list/map expected first argument to be a list');
  }

  if (!isNormalFunction(func)) {
    return loc.fail('list/map expected second argument to be a function');
  }

  return list.map(it => func(List([it]), loc));
}

function listFlatMap(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('list/flatMap expected exactly two arguments, a list and a function');
  }

  const [list, func] = args;

  if (!isList(list)) {
    return loc.fail('list/flatMap expected first argument to be a list');
  }

  if (!isNormalFunction(func)) {
    return loc.fail('list/flatMap expected second argument to be a function');
  }

  return list.flatMap(it => func(List([it]), loc) as Iterable<RuntimeType>);
}

function listFilter(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('list/filter expected exactly two arguments, a list and a function');
  }

  const [list, func] = args;

  if (!isList(list)) {
    return loc.fail('list/filter expected first argument to be a list');
  }

  if (!isNormalFunction(func)) {
    return loc.fail('list/filter expected second argument to be a function');
  }

  return list.filter(it => func(List([it]), loc));
}

function listFold(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 3) {
    return loc.fail('list/fold expected exactly three arguments, a list, and initial value, and a function');
  }

  const [list, init, func] = args;

  if (!isList(list)) {
    return loc.fail('list/fold expected first argument to be a list');
  }

  if (!isNormalFunction(func)) {
    return loc.fail('list/fold expected third argument to be a function');
  }

  return list.reduce((prev, next) => func(List([prev, next]), loc), init);
}

function listTake(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('list/take expected exactly two arguments, a list and a number');
  }

  const [list, count] = args;

  if (!isList(list)) {
    return loc.fail('list/take expected first argument to be a list');
  }

  if (typeof count !== 'number') {
    return loc.fail('list/take expected second argument to be a number');
  }

  return list.take(count);
}

function listDrop(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('list/drop expected exactly two arguments, a list and a number');
  }

  const [list, count] = args;

  if (!isList(list)) {
    return loc.fail('list/drop expected first argument to be a list');
  }

  if (typeof count !== 'number') {
    return loc.fail('list/drop expected second argument to be a number');
  }

  return list.skip(count);
}
