import { List, Record } from 'immutable';

export class Location extends Record<{file: string, line: number, col: number}>({file: '<none>', line: 0, col: 0}) {
  constructor(file: string, line: number, col: number) {
    super({file, line, col});
  }

  static zero = new Location('<none>', 0, 0);

  fail(message: string): never {
    throw new Error(`${message} at ${this.line}:${this.col} in ${this.file}`)
  }
}

export type LiteralType = string | boolean | number | null;

interface BaseToken {
  loc: Location;
}

export interface StringToken extends BaseToken {
  kind: 'string';
  quoted: boolean;
  value: string;
}

export interface VariableToken extends BaseToken {
  kind: 'variable';
  value: string;
}

export interface NumberToken extends BaseToken {
  kind: 'number';
  value: number;
}

export interface LiteralToken extends BaseToken {
  kind: 'literal';
  value: LiteralType;
}

export interface SymbolToken extends BaseToken {
  kind: 'symbol';
  value: string;
}

export type Token = StringToken | VariableToken | NumberToken | LiteralToken | SymbolToken;

interface BaseExpression {
  readonly loc: Location;
  readonly kind: string;
  visit(visitor: Visitor): Expression;
}

const nullLocation = Location.zero;

export class NoOpExpression extends Record<{kind: 'noOp', loc: Location}>({kind: 'noOp', loc: nullLocation}) implements BaseExpression {

  private constructor() {
    super();
  }

  static instance = new NoOpExpression();

  visit(): Expression {
    return this;
  }
}

const noOp = NoOpExpression.instance;

export class SExpression extends Record<{ kind: 'sExpression', loc: Location, head: Expression, body: List<Expression> }>({ kind: 'sExpression', loc: nullLocation, head: noOp, body: List() }) implements BaseExpression {

  constructor(args: {loc: Location, head: Expression, body: List<Expression>}) {
    super(args);
  }

  /**
   * Check if head is a certain function. Checks both variables and unquoted strings
   */
  matchHead(name: string): boolean {
    const head = this.head;

    return (head.kind === 'variable' && head.name === name) || (head.kind === 'value' && head.value === name && !head.quoted);
  }

  visit(visitor: Visitor): Expression {
    const full = this.set('head', this.head.visit(visitor))
      .set('body', this.body.map(it => it.visit(visitor)));

    return visitor.sExpression?.(full) ?? full;
  }
}

export class ArrayExpression extends Record<{kind: 'arrayExpression', loc: Location, body: List<Expression>}>({kind: 'arrayExpression', loc: nullLocation, body: List()}) implements BaseExpression {

  constructor(args: {loc: Location, body: List<Expression>}) {
    super(args);
  }

  visit(visitor: Visitor): Expression {
    const full = this.set('body', this.body.map(it => it.visit(visitor)));

    return visitor.arrayExpression?.(full) ?? full;
  }
}

export class MapExpression extends Record<{kind: 'mapExpression', loc: Location, body: List<readonly [Expression, Expression]>}>({kind: 'mapExpression', loc: nullLocation, body: List()}) implements BaseExpression {

  constructor(args: {loc: Location, body: List<readonly [Expression, Expression]>}) {
    super(args);
  }

  visit(visitor: Visitor): Expression {
    const full = this.set('body', this.body.map(([key, value]) => [key.visit(visitor), value.visit(visitor)] as const));

    return visitor.mapExpression?.(full) ?? full;
  }
}

export class ValueExpression extends Record<{kind: 'value', loc: Location, quoted: boolean, value: LiteralType}>({kind: 'value', loc: nullLocation, quoted: false, value: null}) implements BaseExpression {

  constructor(args: {loc: Location, quoted: boolean, value: LiteralType}) {
    super(args);
  }

  visit(visitor: Visitor): Expression {
    return visitor.value?.(this) ?? this;
  }
}

export class VariableExpression extends Record<{kind: 'variable', loc: Location, name: string}>({kind: 'variable', loc: nullLocation, name: ''}) implements BaseExpression {

  constructor(args: {loc: Location, name: string}) {
    super(args);
  }

  visit(visitor: Visitor): Expression {
    return visitor.variable?.(this) ?? this;
  }
}

export type Expression = NoOpExpression | SExpression | ArrayExpression | MapExpression | ValueExpression | VariableExpression

export interface Visitor {
  sExpression?(ex: SExpression): Expression;
  arrayExpression?(ex: ArrayExpression): Expression;
  mapExpression?(ex: MapExpression): Expression;
  value?(ex: ValueExpression): Expression;
  variable?(ex: VariableExpression): Expression;
}
