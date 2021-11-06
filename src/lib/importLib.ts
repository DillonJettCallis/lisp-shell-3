import { EnvironmentScope, LibScope, LocalScope } from '../runtime';
import { Loader } from '../loader';
import { markMacro } from '../interpreter';
import { List } from 'immutable';
import { dirname, resolve } from 'path';
import { Expression, Location } from '../ast';

export const fileSourceDir = '(file source directory)';
export const shellFlag = '(shellFlag)';

export function initImport(envScope: EnvironmentScope, loader: Loader) {
  envScope.export('import', markMacro((args, loc, interpreter, scope) => {
    if (args.size !== 2) {
      return loc.fail('Expected exactly two arguments to import');
    }

    const [namesEx, pathEx] = args;

    const path = interpreter.evaluate(pathEx, scope);

    if (typeof path !== 'string') {
      return loc.fail(`import's last argument expected to be string but found ${typeof path}`);
    }

    const importKind = chooseImportMode(namesEx, loc);

    const isShell = scope.lookup(shellFlag, loc);
    const baseDir = scope.lookup(isShell ? 'cwd' : fileSourceDir, loc);

    if (typeof baseDir !== 'string') {
      return loc.fail('Unexpected error. `cwd` seems to not be a string');
    }

    const fullPath = resolve(baseDir, path);
    const fullDir = dirname(fullPath);

    const ast = loader.loadFile(fullPath);

    const libScope = envScope.createLib();
    libScope.define(shellFlag, false);
    libScope.define(fileSourceDir, fullDir);
    const libLocal = libScope.childScope();

    ast.forEach(ex => {
      interpreter.evaluate(ex, libLocal);
    });

    importKind(scope, libScope);

    return null;
  }));
}

function chooseImportMode(ex: Expression, loc: Location): (localScope: LocalScope, libScope: LibScope) => void {
  if (ex.kind === 'value' && ex.value === '*') {
    return wildCardImport;
  }

  if (ex.kind === 'variable') {
    return namespacedImport.bind(null, ex.name);
  }

  if (ex.kind === 'arrayExpression') {
    const names = ex?.body?.map(name => {
      if (name.kind !== 'variable') {
        return name.loc.fail('Expected variable name');
      } else {
        return name.name;
      }
    }) ?? List();

    return selectiveImport.bind(null, loc, names);
  }

  return loc.fail('Expected either a single variable, a * wild card or an array of variables to import');
}

function wildCardImport(localScope: LocalScope, libScope: LibScope): void {
  libScope.importAll().forEach(([name, value]) => {
    localScope.define(name, value);
  });
}

function namespacedImport(namespace: string, localScope: LocalScope, libScope: LibScope): void {
  libScope.importAll().forEach(([name, value]) => {
    localScope.define(`${namespace}/${name}`, value);
  });
}

function selectiveImport(loc: Location, names: List<string>, localScope: LocalScope, libScope: LibScope): void {
  names.forEach(name => {
    localScope.define(name, libScope.import(name, loc));
  });
}
