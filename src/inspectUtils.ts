import { Map as ImmutableMap } from 'immutable';
import { inspect, InspectOptions, InspectOptionsStylized } from 'util';

/**
 * Monkey patch some key instance types so they'll util.inspect nicely
 *
 * Should be reasonably safe, since we're using a symbol. Only thing is that if at
 * some point these classes get their own canonical inspection methods we should remove them here.
 */
export function applyInspectPatches(): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-explicit-any
  ImmutableMap.prototype[inspect.custom] = function (this: ImmutableMap<any, any>, depth: number, options: InspectOptionsStylized) {
    depth ??= 0;

    if (depth < 0) {
      return options.stylize('[Map]', 'special');
    }

    if (this.size === 0) {
      return '{}';
    }

    const newOptions = Object.assign({}, options);
    newOptions.depth = depth -1;

    const pairs = this.toKeyedSeq()
      .mapKeys(key => inspect(key, newOptions))
      .map(value => inspect(value, newOptions))
      .map((value, key) => `${key}: ${value}`)
      .toList();

    // if there are more items than maxArrayLength or if the total length of the result is more than breakLength (including the ', ')
    // then we need to break each result onto a separate line. Otherwise, we can fit everything on one line.
    const multiLine = pairs.size > (options.maxArrayLength ?? Infinity)
      || pairs.reduce((sum, next) => sum + next.length + 2, 0) > (options.breakLength ?? Infinity);

    if (multiLine) {
      return '{\n  ' + pairs.join(',\n  ') + '\n}';
    } else {
      return '{ ' + pairs.join(', ') + '}';
    }
  }
}
