import { Expression, SExpression, VariableExpression, Visitor } from '../ast';
import { List } from 'immutable';

/**
 * Transforms:  (defn $name [$x] (+ $x 5))
 * Into:        (def $name (fn [$x] (+ $x 5))
 */
export class DefnDeSugar implements Visitor {

  sExpression(ex: SExpression): Expression {
    if (ex.matchHead('defn')) {
      if (ex.body.size !== 3) {
        return ex.loc.fail("Invalid syntax of 'defn' macro. Must be exactly three arguments, a name, an array of variables, and the body");
      }

      const [name, arr, body] = ex.body;

      const fn = new SExpression(ex.head.loc, new VariableExpression(ex.head.loc, 'fn'), List([arr, body]),);

      return new SExpression(ex.loc, new VariableExpression(ex.head.loc, 'def'), List([name, fn]),);
    } else {
      return ex;
    }
  }
}
