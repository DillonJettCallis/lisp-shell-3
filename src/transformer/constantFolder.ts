import { Expression, ListExpression, MapExpression, ValueExpression, Visitor } from '../ast';

/**
 * Turns arrays or maps of literals into literals too
 */
export class ConstantFolder implements Visitor {

  listExpression(ex: ListExpression): Expression {
    if (ex.body.every(it => it.kind === 'value')) {
      const newBody = ex.body.map(it => (it as unknown as ValueExpression).value);

      return new ValueExpression(ex.loc, false, newBody);
    } else {
      return ex;
    }
  }

  mapExpression(ex: MapExpression): Expression {
    if (ex.body.every((value, key) => key.kind === 'value' && value.kind === 'value')) {
      const newBody = ex.body.toKeyedSeq()
        .mapKeys(key => (key as unknown as ValueExpression).value)
        .map(value => (value as unknown as ValueExpression).value)
        .toMap();

      return new ValueExpression(ex.loc, false, newBody);
    } else {
      return ex;
    }
  }

}
