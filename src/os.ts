import { sep as osPathSeparator } from 'path';
import { platform } from 'os';
import { Windows } from './os/windows';
import { Nix } from './os/nix';
import { List, Map as ImmutableMap, Record } from 'immutable';
import { EnvFunction } from './interpreter';

export interface OsHandler {

  /**
   * Load up all environment variables
   */
  loadEnv(): ImmutableMap<string, string>

  /**
   * Load up just the path variable
   */
  pathVar(): string;

  /**
   * From the given path, parse and load up all shell functions available
   */
  loadPath(path: string): ImmutableMap<string, EnvFunction>

}

export function chooseOs(): OsHandler {
  switch (platform()) {
    case 'win32':
      return new Windows();
    case 'linux':
      return new Nix();
    default:
      throw new Error(`Unknown OS. Sorry, we don't currently support your OS. It's nothing personal, maybe we just haven't tested it? Tell a dev that you want to use '${platform()}'`);
  }
}

export class File extends Record<{
  dir: List<string>;
  name: string;
  ext: string;
}> ({
  dir: List([]),
  name: '',
  ext: '',
}) {

  constructor(dir: List<string>, name: string, ext: string) {
    super({dir, name, ext});
  }

  fullPath(): string {
    return this.dir.join(osPathSeparator) + osPathSeparator + this.name + '.' + this.ext;
  }
}

/**
 * Parse a file path into it's components
 *
 * Assume path is a verified accurate file path.
 *
 * Uses current OS separator.
 *
 * @param path
 */
export function parseFile(path: string): File {
  const lastSlash = path.lastIndexOf(osPathSeparator);

  const dirPath = lastSlash === -1 ? null : path.substring(0, lastSlash);
  const dir = List(dirPath == null ? [] : dirPath.split(osPathSeparator));

  const fileName = path.substring(lastSlash + 1);
  const dotIndex = fileName.lastIndexOf('.');
  const name = dotIndex === -1 ? fileName : fileName.substring(0, dotIndex);
  const ext = dotIndex === -1 ? '' : fileName.substring(dotIndex + 1);

  return new File(dir, name, ext);
}
