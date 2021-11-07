import { lex } from './lexer';
import { parse } from './parser';
import { Expression, Location, NoOpExpression, SExpression } from './ast';
import { readFileSync } from 'fs';
import { List } from 'immutable';
import { TransformerPipeline } from './transform';
import { AutoVariable } from './transformer/autoVariable';
import { NoOpRemover } from './transformer/noOpRemover';
import { LambdaDeSugar } from './transformer/lambdaDeSugar';
import { DefnDeSugar } from './transformer/defnDeSugar';
import { ExportShorthand } from './transformer/exportShorthand';
import { TryDeSugar } from './transformer/tryDeSugar';
import { MacroVerifier } from './transformer/macroVerifier';
import { ConstantFolder } from './transformer/constantFolder';

export class Loader {

  private readonly pipeline = new TransformerPipeline([
    new MacroVerifier(),
    new TryDeSugar(),
    new LambdaDeSugar(),
    new DefnDeSugar(),
    new ExportShorthand(),
    new AutoVariable(),
    new ConstantFolder(),
    new NoOpRemover(),
  ]);

  loadExpression(raw: string, index: number): Expression | undefined {
    const file = `repl input ${index}`;
    const tokens = lex(raw, file);
    const ast = parse(tokens);

    if (ast.size === 0) {
      return undefined;
    }

    return this.pipeline.transform(new SExpression(Location.zero.set('file', file), ast.first()!, ast.shift()));
  }

  loadFile(filePath: string): List<Expression> {
    const raw = readFileSync(filePath, {encoding: 'utf8'});
    const tokens = lex(raw, filePath);
    return parse(tokens)
      .map(it => this.pipeline.transform(it))
      .filter(it => it !== NoOpExpression.instance);
  }
}
