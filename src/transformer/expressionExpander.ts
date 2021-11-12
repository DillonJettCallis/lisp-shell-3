import {
  CdExpression,
  DefExpression,
  ExecuteExpression,
  ExportExpression,
  Expression,
  FnExpression,
  IfExpression,
  ImportExpression,
  ImportMode,
  ImportModeNamed,
  ImportModeNameSpaced,
  ImportModeWild,
  LetExpression,
  Location,
  NoOpExpression,
  SExpression,
  TryExpression
} from '../ast.js';
import { List } from 'immutable';

export class ExpressionExpander {

  sExpression(ex: SExpression): Expression {
    const {loc, head, body} = ex;

    const headName = ExpressionExpander.checkHead(head);

    switch (headName) {
      case 'if': {
        // (if $condition $thenEx $elseEx?)
        if (body.size < 2 || body.size > 3) {
          head.loc.fail('if must contain either two are three arguments');
        }

        const [conditionEx, thenEx, elseEx] = body;

        return new IfExpression(head.loc, conditionEx, thenEx, elseEx);
      }
      case 'def': {
        // (def $name $value)

        if (body.size !== 2) {
          head.loc.fail('def must contain exactly two argument');
        }

        const [nameEx, valueEx] = body;

        if (nameEx.kind !== 'variable') {
          return nameEx.loc.fail('Expected variable name as first argument to def');
        }

        return new DefExpression(head.loc, nameEx.name, valueEx);
      }
      case 'fn': {
        // (fn [$args] $body)

        if (body.size !== 2) {
          head.loc.fail('fn must contain exactly two argument');
        }

        const [argsEx, bodyEx] = body;

        // special case for empty argument list. Can happen because of the constant folder.
        if (argsEx.kind === 'value' && List().equals(argsEx.value)) {
          return new FnExpression(head.loc, List(), bodyEx);
        }

        if (argsEx.kind !== 'arrayExpression') {
          return argsEx.loc.fail('Expected list of variables as second argument to fn');
        }

        const vars = argsEx.body.map(it => {
          if (it.kind !== 'variable') {
            return it.loc.fail('Expected variable name in fn');
          } else {
            return it.name;
          }
        });

        return new FnExpression(head.loc, vars, bodyEx);
      }
      case 'export': {
        // (export $thing)
        // (export $thing $value)

        if (body.size < 1 || body.size > 2) {
          return head.loc.fail('Expected either one or two arguments to export');
        }

        const [nameEx, maybeValueEx] = body;

        if (nameEx.kind !== 'variable') {
          return nameEx.loc.fail('Expected first argument to export to be a variable');
        }

        const name = nameEx.name;

        return new ExportExpression(head.loc, name, maybeValueEx ?? nameEx);
      }
      case 'import': {
        // (import * $path)
        // (import [$vars] $path)
        // (import $namespace $path)

        if (body.size !== 2) {
          return loc.fail('Expected exactly two arguments to import');
        }

        const [namesEx, pathEx] = body;

        const mode = ExpressionExpander.chooseImportMode(namesEx, loc);

        return new ImportExpression(loc, mode, pathEx);
      }
      case 'let': {
        // (let {$name $value} $body)

        if (body.size !== 2) {
          head.loc.fail('Expected exactly two arguments to let');
        }

        const [argsRaw, bodyEx] = body;

        if (argsRaw.kind !== 'mapExpression') {
          return argsRaw.loc.fail('Expected first argument to let to be a map of variable names to values');
        }

        const args = argsRaw.body.mapKeys(key => {
          if (key.kind !== 'variable') {
            return key.loc.fail('Expected keys of let map to be variables');
          } else {
            return key.name;
          }
        });

        return new LetExpression(head.loc, args, bodyEx);
      }
      case 'cd': {
        // (cd $path $body)

        if (body.size < 1 || body.size > 2) {
          head.loc.fail('Expected either one or two arguments to cd');
        }

        const [path, action] = body;

        return new CdExpression(
          head.loc,
          path,
          action
        );
      }
      case 'execute': {
        // (execute $path $args $options)

        if (body.size < 1 || body.size > 3) {
          head.loc.fail('Expected at least one and up to three arguments to execute');
        }

        const [path, args, options] = body;

        return new ExecuteExpression(
          head.loc,
          path,
          args,
          options,
        )
      }
      case 'try': {
        // (try ($body) (catch $err $catchEx) (finally $finallyEx))

        if (body.size < 2 || body.size > 3) {
          head.loc.fail('Expected either two or three arguments to try');
        }

        const [tryEx, maybeCatch, maybeFinally] = body;

        if (tryEx.kind !== 'sExpression') {
          return tryEx.loc.fail('Expected first argument to try to be an sExpression');
        }

        if (maybeCatch.kind !== 'sExpression') {
          return maybeCatch.loc.fail('Expected second argument to try to be an sExpression');
        }

        if (maybeFinally !== undefined && maybeFinally.kind !== 'sExpression') {
          return maybeFinally.loc.fail('Expected third argument to try to be an sExpression');
        }

        if (maybeCatch.matchHead('catch')) {
          if (maybeCatch.body.size != 2) {
            return maybeCatch.loc.fail('Expected exactly two arguments to catch');
          }

          const [catchNameEx, catchEx] = maybeCatch.body;

          if (catchNameEx.kind !== 'variable') {
            return catchNameEx.loc.fail('Expected first argument to catch to be a variable name');
          }

          const catchName = catchNameEx.name;

          if (maybeFinally === undefined) {
            return new TryExpression(
              head.loc,
              tryEx,
              catchName,
              catchEx,
              NoOpExpression.instance
            );
          }

          if (!maybeFinally.matchHead('finally')) {
            return maybeFinally.loc.fail('Expected to find finally block after catch block in a try');
          }

          if (maybeFinally.body.size !== 1) {
            return maybeFinally.loc.fail('Expected exactly one argument to finally');
          }

          const [finallyEx] = maybeFinally.body;

          return new TryExpression(
            head.loc,
            tryEx,
            catchName,
            catchEx,
            finallyEx
          );
        } else {
          if (maybeFinally !== undefined) {
            if (maybeFinally.matchHead('catch')) {
              return head.loc.fail('catch block must come before finally block in a try block');
            } else {
              return maybeFinally.loc.fail('Cannot have anything after a finally block');
            }
          }

          if (!maybeCatch.matchHead('finally')) {
            return maybeCatch.loc.fail('Expected only catch or finally blocks after the main block of a try');
          }

          if (maybeCatch.body.size !== 1) {
            return maybeCatch.loc.fail('Expected exactly one argument to finally');
          }

          const [finallyEx] = maybeCatch.body;

          return new TryExpression(
            head.loc,
            tryEx,
            '',
            NoOpExpression.instance,
            finallyEx
          );
        }
      }
      default:
        return ex;
    }
  }

  private static checkHead(head: Expression): string | null {
    switch (head.kind) {
      case 'variable':
        return head.name;
      case 'value':
        if (!head.quoted && typeof head.value === 'string') {
          return head.value;
        }
    }

    return null;
  }

  private static chooseImportMode(ex: Expression, loc: Location): ImportMode {
    if (ex.kind === 'value' && ex.value === '*') {
      return ImportModeWild.instance;
    }

    if (ex.kind === 'variable') {
      return new ImportModeNameSpaced(ex.name);
    }

    if (ex.kind === 'arrayExpression') {
      const names = ex?.body?.map(name => {
        if (name.kind !== 'variable') {
          return name.loc.fail('Expected variable name');
        } else {
          return name.name;
        }
      });

      if (names == null || names.isEmpty()) {
        return loc.fail('The list of imported variables from an import [] cannot be empty');
      }

      return new ImportModeNamed(names);
    }

    return loc.fail('Expected either a single variable, a * wild card or an array of variables to import');
  }
}
