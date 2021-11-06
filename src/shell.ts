import { Interpreter, markMacro, markNormal } from './interpreter';
import { initCoreLib } from './lib/coreLib';
import { EnvironmentScope } from './runtime';
import { delimiter as osPathDelimiter, resolve as resolvePath, sep as osPathSeparator } from 'path';
import { existsSync, readdirSync } from 'fs';
import { isCollection } from 'immutable';
import { doBuildShellFunction } from './lib/shellLib';
import { createInterface } from 'readline';
import { Loader } from './loader';
import { inspect } from 'util';
import { Location } from './ast';
import { chooseOs } from './os';
import { initImport, shellFlag } from './lib/importLib';

const os = chooseOs();

export class Shell {

  async run(): Promise<void> {
    const loader = new Loader();
    const interpreter = new Interpreter();
    const globalScope = initCoreLib();
    const enclosedEnvScope = globalScope.createEnvironment();
    const pathScope = enclosedEnvScope.createEnvironment();
    const envScope = pathScope.createEnvironment();
    const shellScope = envScope.createShell();
    const replScope = shellScope.childScope();
    const resultScope = replScope.childScope();

    this.loadEnvironment(enclosedEnvScope);
    this.loadPath(pathScope);

    const prompt = createInterface(process.stdin, process.stdout);

    let exitFlag = false;
    let resultIndex = 0;
    let lineIndex = 0;

    replScope.let(shellFlag, true);
    replScope.let('exit', markNormal(() => {exitFlag = true; return null;}));
    replScope.let('cd', markNormal((args, loc) => {
      const init = ensureCurrentWorkingDir(envScope);

      const newPath = args.reduce((prev, next) => {
        if (typeof next !== 'string') {
          return loc.fail('Expected all arguments to cd to be strings');
        }

        return resolvePath(prev, next);
      }, init);

      envScope.export('cwd', newPath);
      return null;
    }));
    replScope.let('clearResults', markNormal(() => {resultScope.clear(); resultIndex = 0; return null;}));
    replScope.let('clearDefs', markNormal(() => {shellScope.clear(); return null;}));
    replScope.let('listDefs', markNormal(() => shellScope.allDefs()));
    replScope.let('listPath', markNormal(() => pathScope.allDefs()));
    replScope.let('resetPath', markNormal(() => {this.loadPath(pathScope); return null;}))
    replScope.let('delete', markMacro((args, loc) => {
      if (args.size !== 1) {
        return loc.fail('Expected exactly one argument to delete')
      }

      const nameEx = args.first()!;

      if (nameEx.kind !== 'variable') {
        return loc.fail('Expected first argument to delete to be a variable');
      }

      shellScope.delete(nameEx.name);
      return null;
    }));
    initImport(envScope, loader);

    function doPrompt(): Promise<void> {
      return new Promise(resolve => {
        console.log('');
        console.log(ensureCurrentWorkingDir(envScope));
        prompt.question('λ ', (line) => {
          try {
            const ast = loader.loadExpression(line, lineIndex++);

            if (ast === undefined) {
              return;
            }

            const result = interpreter.evaluate(ast, resultScope);

            if (result != null && result !== '') {
              const id = `result${resultIndex++}`;

              resultScope.let(id, result);

              if (typeof result === 'string') {
                const extra = result.includes('\n') ? '\n' : '';

                console.log(`$${id}:`, `${extra}${result}`);
              } else {
                const obj = isCollection(result)
                  ? result.toJS()
                  : result;

                console.log(`$${id}:`, inspect(obj, {showHidden: false, depth: 3, colors: true}));
              }
            }

          } catch (e) {
            if (e instanceof Error) {
              console.log(e.message);
            } else {
              console.log('Error occurred, but error was of unknown type: ', e);
            }
          }

          resolve();
        });
      });
    }

    while (!exitFlag) {
      await doPrompt();
    }

    process.exit();
  }

  private loadEnvironment(env: EnvironmentScope): void {
    Object.entries(process.env)
      .map(([key, value]) => {
        if (value !== undefined) {
          env.export(os.envVariableName(key), value);
        }
      });
  }

  private loadPath(env: EnvironmentScope): void {
    // reset it first
    env.clear();
    const fullPath = env.lookup('PATH', Location.zero);

    if (fullPath == null || typeof fullPath !== 'string') {
      return Location.zero.fail('PATH variable either doesn\'t exist or is a non string value.');
    }

    const dirs = fullPath.split(osPathDelimiter);

    dirs.flatMap(dir => {
      if (!existsSync(dir)) {
        return [];
      }

      const files = readdirSync(dir, {withFileTypes: true});

      return files.filter(file => {
        if (file.isFile()) {
          return os.isExecutable(dir + osPathSeparator + file.name)
        } else {
          return false;
        }
      }).map(file => {
        return [dir, file.name] as const;
      });
    }).forEach(([dir, fileName]) => {
      // mapped and filtered down to only the executable files we should add to the path.

      env.export(os.scriptName(fileName), doBuildShellFunction(dir + osPathSeparator + fileName));
    });
  }
}

function ensureCurrentWorkingDir(env: EnvironmentScope): string {
  const maybe = env.check('cwd');

  if (typeof maybe === 'string') {
    return maybe;
  } else {
    const actual = process.cwd();
    env.export('cwd', actual);
    return actual;
  }
}
