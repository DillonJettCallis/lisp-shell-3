import {
  Expression,
  ListExpression,
  Location,
  MapExpression,
  SExpression,
  Token,
  ValueExpression,
  VariableExpression
} from './ast';
import { List, OrderedMap, Range } from 'immutable';

class Parser {

  index = 0;
  max: number;

  constructor(private src: ReadonlyArray<Token>) {
    this.max = src.length - 1;
  }

  parseAll(): List<Expression> {
    const body: Expression[] = [];

    while (this.index <= this.max) {
      body.push(this.parseExpression());
    }

    return List(body);
  }

  parseExpression(): Expression {
    const next = this.next();

    if (next == null) {
      return this.end().fail('Unterminated SExpression');
    } else if (next.kind === 'symbol' && next.value === '(') {
      return this.parseSExpression(next.loc);
    } else if (next.kind === 'symbol' && next.value === '[') {
      return this.parseArrayExpression(next.loc);
    } else if (next.kind === 'symbol' && next.value === '{') {
      return this.parseMapExpression(next.loc);
    } else if (next.kind === 'string') {
      return new ValueExpression(next.loc, next.quoted, next.value);
    } else if (next.kind === 'number') {
      return new ValueExpression(next.loc, false, next.value);
    } else if (next.kind === 'variable') {
      return new VariableExpression(next.loc, next.value);
    } else if (next.kind === 'literal') {
      return new ValueExpression(next.loc, false, next.value);
    } else {
      return next.loc.fail('Unknown token type');
    }
  }

  parseSExpression(loc: Location): SExpression {
    const params = this.parseBraceExpression(')');

    const head = params.first();

    if (head === undefined) {
      loc.fail('Empty s expression');
    }

    const body = params.shift();

    return new SExpression(loc, head, body);
  }

  parseArrayExpression(loc: Location): ListExpression {
    const body = this.parseBraceExpression(']');

    return new ListExpression(loc, body);
  }

  parseMapExpression(loc: Location): MapExpression {
    const params = this.parseBraceExpression('}');

    if (params.size % 2 === 1) {
      loc.fail('Map literal must have an even number of values to form key -> value pairs!')
    }

    const body = Range(0, params.size, 2)
      .map(index => [params.get(index)!, params.get(index + 1)!] as [Expression, Expression]);

    const map = OrderedMap(body.values())

    return new MapExpression(loc, map);
  }

  parseBraceExpression(closeBrace: string): List<Expression> {
    const body: Expression[] = [];

    while (true) {
      const next = this.peek();

      if (next == null) {
        this.end().fail('Unexpected end of file');
      } else if (next.kind === 'symbol' && next.value === closeBrace) {
        this.next();
        return List(body);
      } else {
        body.push(this.parseExpression());
      }
    }
  }

  peek(): Token {
    return this.src[this.index];
  }

  next(): Token | null {
    return this.src[this.index++];
  }

  end(): Location {
    return this.src[this.max].loc;
  }

}

export function parse(src: ReadonlyArray<Token>): List<Expression> {
  const parser = new Parser(src);
  return parser.parseAll();
}

