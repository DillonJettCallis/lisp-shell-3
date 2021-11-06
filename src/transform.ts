import { Expression, Visitor } from './ast';

export class TransformerPipeline {

  constructor(private pipeline: Visitor[]) {
  }

  transform(ex: Expression): Expression {
    return this.pipeline.reduce((prev, next) => prev.visit(next), ex);
  }
}
