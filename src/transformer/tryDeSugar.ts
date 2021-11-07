import {
  ArrayExpression,
  Expression,
  Location,
  SExpression,
  ValueExpression,
  VariableExpression,
  Visitor
} from '../ast';
import { List } from 'immutable';

// input:
// (try (tryBody) (catch $err catchBody) (finally finallyBody))
// output:
// (try (\ tryBody) (fn [$err] (catchBody)) (\ finallyBody))
export class TryDeSugar implements Visitor {
  sExpression(ex: SExpression): Expression {
    if (ex.matchHead('try')) {
      if (ex.body.size === 0 || ex.body.size > 3) {
        return ex.loc.fail('Expected at two or three arguments to try');
      }

      const [bodyEx, maybeCatch, maybeFinally] = ex.body;

      if (bodyEx.kind !== 'sExpression') {
        return bodyEx.loc.fail('Expected first argument to try to be an sExpression');
      }

      if (maybeCatch.kind !== 'sExpression') {
        return maybeCatch.loc.fail('Expected second argument to try to be an sExpression');
      }

      if (maybeFinally !== undefined && maybeFinally.kind !== 'sExpression') {
        return maybeFinally.loc.fail('Expected third argument to try to be an sExpression');
      }

      const tryBody = new SExpression({
        head: new VariableExpression({
          name: 'fn',
          loc: bodyEx.loc,
        }),
        body: List([
          new ArrayExpression({ loc: bodyEx.loc, body: List([]) }),
          bodyEx,
        ]),
        loc: bodyEx.loc,
      });

      const [catchEx, finallyEx] = evaluateCatchArguments(maybeCatch, maybeFinally, ex.loc);

      return new SExpression({
        head: ex.head,
        body: List([
          tryBody,
          catchEx,
          finallyEx,
        ]),
        loc: ex.loc,
      });
    } else {
      return ex;
    }
  }
}

function evaluateCatchArguments(maybeCatch: SExpression, maybeFinally: SExpression | undefined, loc: Location): [catchEx: SExpression, finallyEx: SExpression] {
  if (maybeCatch.matchHead('catch')) {
    if (maybeFinally === undefined) {
      // catch with no finally
      return [translateCatchBlock(maybeCatch), emptyAction(loc)];
    } else {
      if (maybeFinally.matchHead('finally')) {
        return [translateCatchBlock(maybeCatch), translateFinallyBlock(maybeFinally)];
      } else {
        return maybeFinally.loc.fail('Expected final argument to try to be a finally block');
      }
    }
  } else {
    if (maybeCatch.matchHead('finally')) {
      if (maybeFinally === undefined) {
        return [emptyAction(loc), translateFinallyBlock(maybeCatch)];
      } else {
        if (maybeFinally.matchHead('catch')) {
          return loc.fail('Try block has both catch and finally, but in the wrong order. Please put catch before finally');
        } else {
          return maybeFinally.loc.fail('Try block expects nothing after finally block');
        }
      }
    } else {
      return maybeCatch.loc.fail('Try block expected second argument to be either a catch or finally block');
    }
  }
}

// input:
// (catch $err stuff)
// output:
// (fn [$err] stuff)
function translateCatchBlock(catchBlock: SExpression): SExpression {
  if (catchBlock.body.size !== 2) {
    return catchBlock.loc.fail('Expected exactly two arguments to catch block');
  }

  const [varEx, bodyEx] = catchBlock.body;

  if (varEx.kind !== 'variable') {
    return varEx.loc.fail('Expected first argument to catch block to be a variable');
  }

  return new SExpression({
    head: new VariableExpression({
      name: 'fn',
      loc: catchBlock.loc,
    }),
    body: List([
      new ArrayExpression({loc: catchBlock.loc, body: List([varEx])}),
      bodyEx,
    ]),
    loc: catchBlock.loc,
  })
}

// input:
// (finally stuff)
// output:
// (fn [] stuff)
function translateFinallyBlock(finallyBlock: SExpression): SExpression {
  if (finallyBlock.body.size !== 1) {
    return finallyBlock.loc.fail('Expected exactly one arguments to finally block');
  }

  const bodyEx = finallyBlock.body.first()!;

  return new SExpression({
    head: new VariableExpression({
      name: 'fn',
      loc: finallyBlock.loc,
    }),
    body: List([
      new ArrayExpression({loc: finallyBlock.loc, body: List([])}),
      bodyEx,
    ]),
    loc: finallyBlock.loc,
  })
}


function emptyAction(loc: Location): SExpression {
  return new SExpression({
    head: new VariableExpression({
      name: 'fn',
      loc,
    }),
    body: List([
      new ArrayExpression({loc, body: List([])}),
      new ValueExpression({loc, quoted: false, value: null}),
    ]),
    loc,
  })
}
