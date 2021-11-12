import { Expression, ListExpression, MapExpression, NoOpExpression, SExpression, Visitor } from '../ast.js';

const noOp = NoOpExpression.instance;

export class NoOpRemover implements Visitor {

  sExpression(ex: SExpression): Expression {
    if (ex.head === noOp) {
      return noOp;
    }

    return ex.set('body', ex.body.filter(it => it !== noOp));
  }

  listExpression(ex: ListExpression): Expression {
    return ex.set('body', ex.body.filter(it => it !== noOp));
  }

  mapExpression(ex: MapExpression): Expression {
    return ex.set('body', ex.body.filter((value, key) => key !== noOp && value !== noOp));
  }
}
