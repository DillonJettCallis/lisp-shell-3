import { Set as ImmutableSet } from 'immutable';
import { Expression, ListExpression, MapExpression, SExpression, Visitor } from '../ast';

const macros = ImmutableSet(['def', 'defn', 'fn', 'let', 'export', 'import', 'try', 'catch', 'finally', '\\'])


/**
 * Ensure that a certain list of vars are never declared
 */
export class MacroVerifier implements Visitor {

  sExpression(ex: SExpression): Expression {
    ex.body.forEach(MacroVerifier.checkMacro);

    return ex;
  }

  listExpression(ex: ListExpression): Expression {
    ex.body.forEach(MacroVerifier.checkMacro);

    return ex;
  }

  mapExpression(ex: MapExpression): Expression {
    ex.body.forEach((value, key) => {
      MacroVerifier.checkMacro(key);
      MacroVerifier.checkMacro(value);
    });

    return ex;
  }

  private static checkMacro(this: void, ex: Expression) {
    if (ex.kind === 'variable' && macros.includes(ex.name)) {
      ex.loc.fail(`Illegal use of macro ${ex.name} as a value`);
    }
  }

}
