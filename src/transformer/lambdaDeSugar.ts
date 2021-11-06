import { ArrayExpression, Expression, SExpression, VariableExpression, Visitor } from '../ast';
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
      const head = new VariableExpression({loc: ex.head.loc, name: 'fn'});
      const execBody = new SExpression({loc: ex.loc, head: ex.body.first(), body: ex.body.shift()});
      const args = new ArrayExpression({loc: ex.loc, body: List([])});

      return new SExpression({loc: ex.loc, head, body: List([args, execBody]) });
    } else {
      return ex;
    }
  }

}
