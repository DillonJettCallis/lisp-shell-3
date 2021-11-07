import { Expression, ListExpression, SExpression, VariableExpression, Visitor } from '../ast';
import { List } from 'immutable';

/**
 * Transforms:  (\ + $1 5)
 * Into:        (fn [] (+ $1 5))
 *
 * Make sure to run this BEFORE autoVariable
 */
export class LambdaDeSugar implements Visitor {

  sExpression(ex: SExpression): Expression {
    if (ex.matchHead('\\')) {
      const head = new VariableExpression(ex.head.loc, 'fn');
      const execBody = new SExpression(ex.loc, ex.body.first(), ex.body.shift());
      const args = new ListExpression(ex.loc, List([]));

      return new SExpression(ex.loc, head, List([args, execBody]));
    } else {
      return ex;
    }
  }

}
