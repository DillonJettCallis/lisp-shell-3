import { GlobalScopeBuilder } from './coreLib.js';
import { fromJS, List } from 'immutable';
import { RuntimeType } from '../runtime.js';
import { Location } from '../ast.js';

export function initParseLib(builder: GlobalScopeBuilder): void {
  builder.addFunction('parse/json', parseJson);
  builder.addFunction('parse/lines', parseLines);
}

function parseJson(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('parse/json expected exactly one argument');
  }

  const raw = args.first();

  if (typeof raw !== 'string') {
    return loc.fail('parse/json only accepts strings');
  }

  // parsing JSON and feeding it to fromJS will always return a valid type.
  return fromJS(JSON.parse(raw)) as RuntimeType;
}

function parseLines(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('parse/json expected exactly one argument');
  }

  const raw = args.first();

  if (typeof raw !== 'string') {
    return loc.fail('parse/json only accepts strings');
  }

  return List(raw.trim().split('\n'))
}

