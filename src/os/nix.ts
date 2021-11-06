import { OsHandler } from '../os';
import { accessSync, constants as FileConstants } from 'fs';

export class Nix implements OsHandler {
  envVariableName(name: string): string {
    return name;
  }

  isExecutable(fullFileName: string): boolean {
    try {
      accessSync(fullFileName, FileConstants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  scriptName(name: string): string {
    return name;
  }

}

