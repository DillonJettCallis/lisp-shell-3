import { OsHandler, parseFile } from '../os';
import { accessSync, constants as FileConstants, existsSync, readdirSync } from 'fs';
import { Map as ImmutableMap, Seq } from 'immutable';
import { EnvFunction, NormalFunction } from '../interpreter';
import { delimiter as osPathDelimiter, sep as osPathSeparator } from 'path';
import { doBuildShellFunction } from '../lib/shellLib';

export class Nix implements OsHandler {

  private static isExecutable(fullFileName: string): boolean {
    try {
      accessSync(fullFileName, FileConstants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  loadEnv(): ImmutableMap<string, string> {
    return (Seq(process.env) as Seq.Keyed<string, string>)
      .filter(it => it !== undefined)
      .toMap();
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
    }).filter(file => Nix.isExecutable(file.fullPath()))
      .toKeyedSeq()
      .mapKeys((_index, {name}) => name)
      .map(file => doBuildShellFunction(file.fullPath()))
      .toMap();
  }

  pathVar(): string {
    const path = process.env.PATH;

    if (path === undefined) {
      throw new Error("Something is wrong. Expected to find var named 'PATH' but none was found. Is it cased wrong?");
    }

    return path;
  }

}

