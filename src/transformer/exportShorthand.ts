/**
 * In:  (export $x)
 * Out: (export $x $x)
 */
import { Expression, SExpression, Visitor } from '../ast.js';

export class ExportShorthand implements Visitor {

  sExpression(ex: SExpression): Expression {
    if (ex.matchHead('export') && ex.body.size === 1 && ex.body.first()!.kind === 'variable') {
      // double the body
      return ex.set('body', ex.body.concat(ex.body));
    } else {
      return ex;
    }
  }

}
