import { GlobalScopeBuilder } from './coreLib';
import { List } from 'immutable';
import { RuntimeType } from '../runtime';
import { Location } from '../ast';
import { markNormal } from '../interpreter';

export function initMetaLib(builder: GlobalScopeBuilder): void {
  builder.addFunction('meta/native', doNative);
}

function doNative(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('Expected exactly one argument to meta/native');
  }

  const raw = args.first();

  if (typeof raw !== 'string') {
    return loc.fail('Expected first argument to meta/native to be a string');
  }

  // this line makes the compiler and the linter very angry at me.

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return markNormal(new Function('args', 'loc', raw));
}
