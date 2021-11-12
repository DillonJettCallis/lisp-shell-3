import { lex } from './lexer.js';
import { parse } from './parser.js';
import { Expression, Location, NoOpExpression, SExpression } from './ast.js';
import { readFileSync } from 'fs';
import { List } from 'immutable';
import { TransformerPipeline } from './transform.js';
import { AutoVariable } from './transformer/autoVariable.js';
import { NoOpRemover } from './transformer/noOpRemover.js';
import { LambdaDeSugar } from './transformer/lambdaDeSugar.js';
import { ExportShorthand } from './transformer/exportShorthand.js';
import { TryDeSugar } from './transformer/tryDeSugar.js';
import { MacroVerifier } from './transformer/macroVerifier.js';
import { ConstantFolder } from './transformer/constantFolder.js';
import { ExpressionExpander } from './transformer/expressionExpander.js';
import { BooleanOpTransformer } from './transformer/booleanOpTransformer.js';
import { DefnDeSugar } from './transformer/defnDeSugar.js';

export class Loader {

  private readonly pipeline = new TransformerPipeline([
    new MacroVerifier(),
    new TryDeSugar(),
    new BooleanOpTransformer(),
    new LambdaDeSugar(),
    new DefnDeSugar(),
    new ExportShorthand(),
    new AutoVariable(),
    new ConstantFolder(),
    new NoOpRemover(),
    new ExpressionExpander(),
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
