import { Expression, FnExpression, ListExpression, SExpression, VariableExpression, Visitor } from '../ast.js';
import { List } from 'immutable';

/**
 * Expands lambda, defn and exportfn
 * Make sure to run this BEFORE autoVariable
 */
export class LambdaDeSugar implements Visitor {

  sExpression(ex: SExpression): Expression {
    if (ex.matchHead('\\')) {
      /**
       * Transforms:  (\ + $1 5)
       * Into:        (fn [] (+ $1 5))
       */
      const head = new VariableExpression(ex.head.loc, 'fn');
      const execBody = new SExpression(ex.loc, ex.body.first(), ex.body.shift());
      const args = new ListExpression(ex.loc, List([]));

      return new SExpression(ex.loc, head, List([args, execBody]));
    } else if (ex.matchHead('defn')) {
      /**
       * Transforms:  (defn $name [$x] (+ $x 5))
       * Into:        (def $name (fn [$x] (+ $x 5))
       */

      if (ex.body.size !== 3) {
        return ex.loc.fail("Invalid syntax of 'defn' macro. Must be exactly three arguments, a name, an array of variables, and the body");
      }

      const [name, arr, body] = ex.body;

      const fn = new SExpression(ex.head.loc, new VariableExpression(ex.head.loc, 'fn'), List([arr, body]),);

      return new SExpression(ex.loc, new VariableExpression(ex.head.loc, 'def'), List([name, fn]),);
    } else if (ex.matchHead('exportfn')) {
      /**
       * Transforms:  (exportfn $thing [$args] $body)
       * Into:        (export $thing (fn [$args] $body))
       */

      if (ex.body.size !== 3) {
        ex.head.loc.fail('exportfn must contain exactly three argument');
      }

      const [nameEx, argsEx, bodyEx] = ex.body;

      if (nameEx.kind !== 'variable') {
        return nameEx.loc.fail('Expected variable name as first argument to exportfn');
      }

      if (argsEx.kind !== 'arrayExpression') {
        return argsEx.loc.fail('Expected list of variables as second argument to exportfn');
      }

      const vars = argsEx.body.map(it => {
        if (it.kind !== 'variable') {
          return it.loc.fail('Expected variable name in exportfn');
        } else {
          return it.name;
        }
      });

      return new SExpression(
        ex.head.loc,
        new VariableExpression(ex.head.loc, 'export'),
        List([
          nameEx,
          new FnExpression(ex.head.loc, vars, bodyEx),
        ]),
      )
    } else {
      return ex;
    }
  }

}
