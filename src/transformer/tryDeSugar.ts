import {
  Expression,
  ListExpression,
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

      const tryBody = new SExpression(
        bodyEx.loc,
        new VariableExpression(bodyEx.loc, 'fn',),
        List([
          new ListExpression(bodyEx.loc, List()),
          bodyEx,
        ]),
      );

      const [catchEx, finallyEx] = evaluateCatchArguments(maybeCatch, maybeFinally, ex.loc);

      return new SExpression(
        ex.loc,
        ex.head,
        List([
          tryBody,
          catchEx,
          finallyEx,
        ]),
      );
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

  return new SExpression(
    catchBlock.loc,
    new VariableExpression(
      catchBlock.loc,
      'fn',
    ),
    List([
      new ListExpression(catchBlock.loc, List([varEx])),
      bodyEx,
    ]),
  )
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

  return new SExpression(
    finallyBlock.loc,
    new VariableExpression(
      finallyBlock.loc,
      'fn',
    ),
    List([
      new ListExpression(finallyBlock.loc, List()),
      bodyEx,
    ]),
  )
}


function emptyAction(loc: Location): SExpression {
  return new SExpression(
    loc,
    new VariableExpression(loc, 'fn',),
    List([
      new ListExpression(loc, List()),
      new ValueExpression(loc, false, null),
    ]),
  )
}
