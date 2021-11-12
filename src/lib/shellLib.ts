import { GlobalScopeBuilder } from './coreLib.js';
import { List, Map as ImmutableMap } from 'immutable';
import { ExecuteExpression, FnExpression, Location, SExpression, ValueExpression, VariableExpression } from '../ast.js';
import { GlobalScope, RuntimeType } from '../runtime.js';
import { Interpreter, markNormal, NormalFunction } from '../interpreter.js';
import { Loader } from '../loader.js';

export function initShellLib(builder: GlobalScopeBuilder): void {
  builder.addFunction('@', buildShellFunction);
}

function buildShellFunction(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('Expected exactly 1 argument to @ function');
  }

  const path = args.first()!;

  if (typeof path !== 'string') {
    return loc.fail('Expected only argument to @ function to be a string');
  }

  return doBuildShellFunction(path);
}

/**
 * Build a shell function out of a file path to an executable file.
 * @param path
 */
export function doBuildShellFunction(path: string): NormalFunction {
  const pseudoScope = new GlobalScope(ImmutableMap()).createEnvironment().createShell().childScope();
  const pseudoLoader = new Loader();
  const pseudoInterpreter = new Interpreter(pseudoLoader);

  const loc = new Location('[native]', 0, 0);
  const literalAst = new FnExpression(
    loc,
    List(),
    new SExpression(
      loc,
      new ValueExpression(loc, false, markNormal((args) => (args.first() as ImmutableMap<string, string>).get('stdout')!)),
      List([
        new ExecuteExpression(
          loc,
          new ValueExpression(loc, false, path),
          new VariableExpression(loc, '0'),
        ),
      ]),
    )
  );

  return pseudoInterpreter.evaluate(literalAst, pseudoScope) as NormalFunction;
}

