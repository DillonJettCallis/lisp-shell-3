import { EnvironmentScope, LibScope, LocalScope } from './runtime';
import { List } from 'immutable';
import { Expression, Location } from './ast';
import { MacroFunction, markMacro } from './interpreter';
import { dirname, resolve } from 'path';
import { Loader } from './loader';

const loader = new Loader();

export function doImport(env: EnvironmentScope, baseDir?: string): MacroFunction {
  return markMacro((args, loc, interpreter, scope) => {
    if (args.size !== 2) {
      return loc.fail('Expected exactly two arguments to import');
    }

    const [namesEx, pathEx] = args;

    const path = interpreter.evaluate(pathEx, scope);

    if (typeof path !== 'string') {
      return loc.fail(`import's last argument expected to be string but found ${typeof path}`);
    }

    const importKind = chooseImportMode(namesEx, loc);

    const fullPath = resolve(baseDir ?? env.cwd, path);
    const fullDir = dirname(fullPath);

    const ast = loader.loadFile(fullPath);

    const libScope = env.createLib(fullDir);
    const libLocal = libScope.childScope();

    ast.forEach(ex => {
      interpreter.evaluate(ex, libLocal);
    });

    importKind(scope, libScope);

    return null;
  })
}

export function chooseImportMode(ex: Expression, loc: Location): (localScope: LocalScope, libScope: LibScope) => void {
  if (ex.kind === 'value' && ex.value === '*') {
    return wildCardImport;
  }

  if (ex.kind === 'variable') {
    return namespacedImport.bind(null, ex.name);
  }

  if (ex.kind === 'listExpression') {
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
