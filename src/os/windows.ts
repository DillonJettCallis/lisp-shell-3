import { OsHandler, parseFile } from '../os';
import { List, Map as ImmutableMap, Seq, Set as ImmutableSet } from 'immutable';
import { EnvFunction, NormalFunction } from '../interpreter';
import { delimiter as osPathDelimiter, sep as osPathSeparator } from 'path';
import { existsSync, readdirSync } from 'fs';
import { doBuildShellFunction } from '../lib/shellLib';

export class Windows implements OsHandler {

  private readonly validExtensions: ImmutableSet<string>;

  constructor() {
    this.validExtensions = List(process.env.PATHEXT!.split(osPathDelimiter))
      .map(it => it.slice(1).toLowerCase())
      .toSet();
  }

  loadEnv(): ImmutableMap<string, string> {
    return (Seq(process.env) as Seq.Keyed<string, string>)
      .filter(it => it !== undefined)
      .mapKeys(key => key.toUpperCase())
      .toMap();
  }

  pathVar(): string {
    const path = process.env.Path;

    if (path === undefined) {
      throw new Error("Something is wrong. Expected to find windows var named 'Path' but none was found. Is it cased wrong?");
    }

    return path;
  }

  loadPath(path: string): ImmutableMap<string, EnvFunction> {
    const dirs = Seq(path.split(osPathDelimiter));

    return dirs.flatMap(dir => {
      if (!existsSync(dir)) {
        return [];
      }

      const files = Seq(readdirSync(dir, {withFileTypes: true}));

      return files.filter(file => file.isFile())
        .map(file => parseFile(dir + osPathSeparator + file.name));
    }).filter(({ext}) => this.validExtensions.includes(ext.toLowerCase()))
      .toKeyedSeq()
      .mapKeys((_index, {name}) => name)
      .map(file => doBuildShellFunction(file.fullPath()))
      .toMap();
  }
}
