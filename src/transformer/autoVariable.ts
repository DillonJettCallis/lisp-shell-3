import { Expression, SExpression, VariableExpression, Visitor } from '../ast';

export class AutoVariable implements Visitor {
  sExpression(ex: SExpression): Expression {
    if (ex.head.kind === 'value') {
      const head = ex.head;

      if (!head.quoted && typeof head.value === 'string') {
        // if the first param is an unquoted string, replace it with a variable of the same name
        return ex.set('head', new VariableExpression(head.loc, head.value));
      }
    }

    return ex;
  }
}
