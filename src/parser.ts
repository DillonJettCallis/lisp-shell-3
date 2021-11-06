import {
  ArrayExpression,
  Expression,
  Location,
  MapExpression,
  SExpression,
  Token,
  ValueExpression,
  VariableExpression
} from './ast';
import { List, Range } from 'immutable';

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
      return new ValueExpression({value: next.value, quoted: next.quoted, loc: next.loc });
    } else if (next.kind === 'number') {
      return new ValueExpression({ value: next.value, quoted: false, loc: next.loc });
    } else if (next.kind === 'variable') {
      return new VariableExpression({name: next.value, loc: next.loc});
    } else if (next.kind === 'literal') {
      return new ValueExpression({value: next.value, quoted: false, loc: next.loc});
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

    return new SExpression({head, body, loc});
  }

  parseArrayExpression(loc: Location): ArrayExpression {
    const body = this.parseBraceExpression(']');

    return new ArrayExpression({body, loc});
  }

  parseMapExpression(loc: Location): MapExpression {
    const params = this.parseBraceExpression('}');

    if (params.size % 2 === 1) {
      loc.fail('Map literal must have an even number of values to form key -> value pairs!')
    }

    const body = Range(0, params.size, 2)
      .map(index => [params.get(index)!, params.get(index + 1)!] as const)
      .toList();

    return new MapExpression({body, loc});
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

