import { Interpreter } from './interpreter';
import { initCoreLib } from './lib/coreLib';
import { isCollection } from 'immutable';
import { createInterface } from 'readline';
import { Loader } from './loader';
import { inspect } from 'util';

export class Shell {

  async run(): Promise<void> {
    const loader = new Loader();
    const interpreter = new Interpreter();
    const globalScope = initCoreLib();
    const envScope = globalScope.createEnvironment();
    const shellScope = envScope.createShell();
    const localScope = shellScope.childScope();

    const prompt = createInterface(process.stdin, process.stdout);

    let lineIndex = 0;

    function doPrompt(): Promise<void> {
      return new Promise(resolve => {
        console.log('');
        console.log(envScope.cwd);
        prompt.question('λ ', (line) => {
          try {
            const ast = loader.loadExpression(line, lineIndex++);

            if (ast === undefined) {
              return;
            }

            const result = interpreter.evaluate(ast, localScope);

            if (result != null && result !== '') {
              const id = shellScope.result(result);

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

    while (!shellScope.exitFlag) {
      await doPrompt();
    }

    process.exit();
  }
}
