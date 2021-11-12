import { Expression, SExpression, ValueExpression, VariableExpression, Visitor } from '../ast.js';
import { List } from 'immutable';

export class BooleanOpTransformer implements Visitor {

  sExpression(ex: SExpression): Expression {
    if (ex.matchHead('and')) {
      return ex.body.reduce<Expression>((prev, next) => {
        return new SExpression(
          ex.loc,
          new VariableExpression(ex.loc, 'if'),
          List([
            prev,
            next,
            new ValueExpression(next.loc, false, false),
          ]),
        );
      });
    }

    if (ex.matchHead('or')) {
      return ex.body.reduce<Expression>((prev, next) => {
        return new SExpression(
          ex.loc,
          new VariableExpression(ex.loc, 'if'),
          List([
            prev,
            new ValueExpression(next.loc, true, false),
            next,
          ]),
        );
      });
    }

    return ex;
  }

}
