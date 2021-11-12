import { GlobalScopeBuilder } from './coreLib.js';
import { isSeq, List, Range, Seq } from 'immutable';
import { RuntimeType } from '../runtime.js';
import { Location } from '../ast.js';
import { isNormalFunction } from '../interpreter.js';

export function initSeqLib(builder: GlobalScopeBuilder): void {
  builder.addFunction('seq/toList', seqToList);
  builder.addFunction('seq/map', seqMap);
  builder.addFunction('seq/flatMap', seqFlatMap);
  builder.addFunction('seq/filter', seqFilter);
  builder.addFunction('seq/range', seqRange);
  builder.addFunction('seq/take', seqTake);
}

function seqToList(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('Expected exactly one argument to seq/toList');
  }

  const seq = args.first();

  if (!isSeq(seq)) {
    return loc.fail('seq/toList expected only argument to be a seq');
  }

  return seq.toList() as List<RuntimeType>;
}

function seqRange(args: List<RuntimeType>, loc: Location): RuntimeType {
  const [min, max] = args;

  if (min != null && typeof min !== 'number') {
    return loc.fail('Expected first argument of seq/range to be a number');
  }

  if (max != null && typeof max !== 'number') {
    return loc.fail('Expected second argument of seq/range to be a number');
  }

  return Range(min ?? 0, max ?? Infinity);
}

// (seq/map $arr $function)
function seqMap(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('seq/map expected exactly two arguments, a seq and a function');
  }

  const [seq, func] = args;

  if (!isSeq(seq)) {
    return loc.fail('seq/map expected first argument to be a seq');
  }

  if (!isNormalFunction(func)) {
    return loc.fail('seq/map expected second argument to be a function');
  }

  return (seq as Seq<unknown, RuntimeType>).map(it => func(List([it]), loc));
}

function seqFlatMap(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('seq/flatMap expected exactly two arguments, a seq and a function');
  }

  const [seq, func] = args;

  if (!isSeq(seq)) {
    return loc.fail('seq/flatMap expected first argument to be a seq');
  }

  if (!isNormalFunction(func)) {
    return loc.fail('seq/flatMap expected second argument to be a function');
  }

  return (seq as Seq<unknown, RuntimeType>).flatMap(it => func(List([it]), loc) as Iterable<RuntimeType>);
}

function seqFilter(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('seq/filter expected exactly two arguments, a seq and a function');
  }

  const [seq, func] = args;

  if (!isSeq(seq)) {
    return loc.fail('seq/filter expected first argument to be a seq');
  }

  if (!isNormalFunction(func)) {
    return loc.fail('seq/filter expected second argument to be a function');
  }

  return (seq as Seq<unknown, RuntimeType>).filter(it => func(List([it]), loc));
}

function seqTake(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('seq/take expected exactly two arguments, a seq and a number');
  }

  const [seq, count] = args;

  if (!isSeq(seq)) {
    return loc.fail('seq/take expected first argument to be a seq');
  }

  if (typeof count !== 'number') {
    return loc.fail('seq/take expected second argument to be a number');
  }

  return seq.take(count);
}
