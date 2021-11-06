import { sep as osPathSeparator } from 'path';
import { platform } from 'os';
import { Windows } from './os/windows';
import { Nix } from './os/nix';

export interface OsHandler {

  /**
   * From a file name, return the name that should be included in the shell. Might be the same.
   */
  scriptName(name: string): string;

  /**
   * From the name of an environment variable, what name should be included in the shell.
   */
  envVariableName(name: string): string;

  /**
   * Is this file an executable?
   */
  isExecutable(fullFileName: string): boolean;

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

/**
 * Parse a file path into it's components
 *
 * Assume path is a verified accurate file path.
 *
 * Uses current OS separator.
 *
 * @param path
 */
export function parseFile(path: string): {dir: string[], name: string, ext: string} {
  const lastSlash = path.lastIndexOf(osPathSeparator);

  const dirPath = lastSlash === -1 ? null : path.substring(0, lastSlash);
  const dir = dirPath == null ? [] : dirPath.split(osPathSeparator);

  const fileName = path.substring(lastSlash + 1);
  const dotIndex = fileName.lastIndexOf('.');
  const name = dotIndex === -1 ? fileName : fileName.substring(0, dotIndex);
  const ext = dotIndex === -1 ? '' : fileName.substring(dotIndex + 1);

  return {dir, name, ext};
}
