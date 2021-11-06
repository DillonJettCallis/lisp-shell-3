import { ArrayExpression, Expression, MapExpression, NoOpExpression, SExpression, Visitor } from '../ast';

const noOp = NoOpExpression.instance;

export class NoOpRemover implements Visitor {

  sExpression(ex: SExpression): Expression {
    if (ex.head === noOp) {
      return noOp;
    }

    return ex.set('body', ex.body.filter(it => it !== noOp));
  }

  arrayExpression(ex: ArrayExpression): Expression {
    return ex.set('body', ex.body.filter(it => it !== noOp));
  }

  mapExpression(ex: MapExpression): Expression {
    return ex.set('body', ex.body.filter(it => it[0] !== noOp && it[1] !== noOp));
  }
}
