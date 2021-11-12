import { List, OrderedMap, Record } from 'immutable';
import { RuntimeType } from './runtime';

export class Location extends Record<{file: string, line: number, col: number}>({file: '<none>', line: 0, col: 0}) {
  constructor(file: string, line: number, col: number) {
    super({file, line, col});
  }

  static zero = new Location('<none>', 0, 0);

  fail(message: string): never {
    throw new Error(`${message} at ${this.line}:${this.col} in ${this.file}`)
  }
}

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
  value: RuntimeType;
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

  constructor(loc: Location, head: Expression, body: List<Expression>) {
    super({loc, head, body});
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

export class ListExpression extends Record<{kind: 'listExpression', loc: Location, body: List<Expression>}>({kind: 'listExpression', loc: nullLocation, body: List()}) implements BaseExpression {

  constructor(loc: Location, body: List<Expression>) {
    super({loc, body});
  }

  visit(visitor: Visitor): Expression {
    const full = this.set('body', this.body.map(it => it.visit(visitor)));

    return visitor.listExpression?.(full) ?? full;
  }
}

export class MapExpression extends Record<{kind: 'mapExpression', loc: Location, body: OrderedMap<Expression, Expression>}>({kind: 'mapExpression', loc: nullLocation, body: OrderedMap()}) implements BaseExpression {

  constructor(loc: Location, body: OrderedMap<Expression, Expression>) {
    super({loc, body});
  }

  visit(visitor: Visitor): Expression {
    const full = this.set('body', this.body.mapKeys(key => key.visit(visitor)).map(value => value.visit(visitor)));

    return visitor.mapExpression?.(full) ?? full;
  }
}

export class ValueExpression extends Record<{kind: 'value', loc: Location, quoted: boolean, value: RuntimeType}>({kind: 'value', loc: nullLocation, quoted: false, value: null}) implements BaseExpression {

  constructor(loc: Location, quoted: boolean, value: RuntimeType) {
    super({loc, quoted, value});
  }

  visit(visitor: Visitor): Expression {
    return visitor.value?.(this) ?? this;
  }
}

export class VariableExpression extends Record<{kind: 'variable', loc: Location, name: string}>({kind: 'variable', loc: nullLocation, name: ''}) implements BaseExpression {

  constructor(loc: Location, name: string) {
    super({loc, name});
  }

  visit(visitor: Visitor): Expression {
    return visitor.variable?.(this) ?? this;
  }
}

export type Expression = NoOpExpression | SExpression | ListExpression | MapExpression | ValueExpression | VariableExpression

export interface Visitor {
  sExpression?(ex: SExpression): Expression;
  listExpression?(ex: ListExpression): Expression;
  mapExpression?(ex: MapExpression): Expression;
  value?(ex: ValueExpression): Expression;
  variable?(ex: VariableExpression): Expression;
}
