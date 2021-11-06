import { OsHandler, parseFile } from '../os';
import { List, Set as ImmutableSet } from 'immutable';

export class Windows implements OsHandler {

  private readonly validExtensions: ImmutableSet<string>;

  constructor() {
    this.validExtensions = List(process.env.PATHEXT!.split(';'))
      .map(it => it.slice(1).toLowerCase())
      .toSet();
  }

  envVariableName(name: string): string {
    // uppercase all the names just to make it easier.
    // be sure to document this.
    return name.toUpperCase();
  }

  isExecutable(fullFileName: string): boolean {
    // on windows, it's based solely on file name.

    const { ext } = parseFile(fullFileName);

    return this.validExtensions.includes(ext.toLowerCase());
  }

  scriptName(name: string): string {
    const { name: shortName } = parseFile(name);

    return shortName;
  }



}
