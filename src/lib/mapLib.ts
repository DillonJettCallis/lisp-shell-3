import { GlobalScopeBuilder } from './coreLib';
import { isMap, List } from 'immutable';
import { RuntimeType } from '../runtime';
import { Location } from '../ast';

export function initMapLib(builder: GlobalScopeBuilder): void {
  builder.addFunction('map/get', mapGet);
  builder.addFunction('map/set', mapSet);
  builder.addFunction('map/has', mapHas);
  builder.addFunction('map/remove', mapRemove);
}

// (map/get $map $key)
function mapGet(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('map/get expected exactly two arguments, a map and a key');
  }

  const [map, key] = args;

  if (!isMap(map)) {
    return loc.fail('map/get expected first argument to be a map');
  }

  return map.get(key) ?? null;
}

// (map/set $map $key $value)
function mapSet(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 3) {
    return loc.fail('map/set expected exactly three arguments, a map, a key and a value');
  }

  const [map, key, value] = args;

  if (!isMap(map)) {
    return loc.fail('map/set expected first argument to be a map');
  }

  return map.set(key, value);
}

// (map/has $map $key)
function mapHas(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('map/get expected exactly two arguments, a map and a key');
  }

  const [map, key] = args;

  if (!isMap(map)) {
    return loc.fail('map/get expected first argument to be a map');
  }

  return map.has(key);
}

// (map/remove $map $key)
function mapRemove(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 2) {
    return loc.fail('map/get expected exactly two arguments, a map and a key');
  }

  const [map, key] = args;

  if (!isMap(map)) {
    return loc.fail('map/get expected first argument to be a map');
  }

  return map.delete(key);
}
