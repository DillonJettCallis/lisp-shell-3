import { List, OrderedMap, Record } from 'immutable';
import { RuntimeType } from './runtime.js';

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

export class ListExpression extends Record<{kind: 'arrayExpression', loc: Location, body: List<Expression>}>({kind: 'arrayExpression', loc: nullLocation, body: List()}) implements BaseExpression {

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

export class IfExpression extends Record<{kind: 'if', loc: Location, condition: Expression, thenEx: Expression, elseEx: Expression}>({kind: 'if', loc: nullLocation, condition: noOp, thenEx: noOp, elseEx: noOp}) implements BaseExpression {
  constructor(loc: Location, condition: Expression, thenEx: Expression, elseEx?: Expression) {
    super({loc, condition, thenEx, elseEx});
  }

  visit(visitor: Visitor): Expression {
    return visitor.ifExpression?.(this) ?? this;
  }
}

export class DefExpression extends Record<{kind: 'def', loc: Location, name: string, value: Expression}>({kind: 'def', loc: nullLocation, name: '', value: noOp}) implements BaseExpression {
  constructor(loc: Location, name: string, value: Expression) {
    super({loc, name, value});
  }

  visit(visitor: Visitor): Expression {
    return visitor.defExpression?.(this) ?? this;
  }
}

export class ExportExpression extends Record<{kind: 'export', loc: Location, name: string, value: Expression}>({kind: 'export', loc: nullLocation, name: '', value: noOp}) implements BaseExpression {
  constructor(loc: Location, name: string, value: Expression) {
    super({loc, name, value});
  }

  visit(visitor: Visitor): Expression {
    return visitor.exportExpression?.(this) ?? this;
  }
}

export class ImportModeWild extends Record<{kind: 'wild' }>({kind: 'wild'}) {
  static readonly instance = new ImportModeWild();
  private constructor() {
    super();
  }
}
export class ImportModeNameSpaced extends Record<{kind: 'namespaced', namespace: string }>({kind: 'namespaced', namespace: ''}) {
   constructor(namespace: string) {
    super({namespace});
  }
}

export class ImportModeNamed extends Record<{kind: 'named', names: List<string> }>({kind: 'named', names: List()}) {
  constructor(names: List<string>) {
    super({names});
  }
}

export type ImportMode = ImportModeWild | ImportModeNameSpaced | ImportModeNamed;

export class ImportExpression extends Record<{kind: 'import', loc: Location, mode: ImportMode, path: Expression}>({kind: 'import', loc: nullLocation, mode: ImportModeWild.instance, path: noOp}) {
  constructor(loc: Location, mode: ImportMode, path: Expression) {
    super({loc, mode, path});
  }

  visit(visitor: Visitor): Expression {
    return visitor.importExpression?.(this) ?? this;
  }
}

export class FnExpression extends Record<{kind: 'fn', loc: Location, args: List<string>, body: Expression}>({kind: 'fn', loc: nullLocation, args: List(), body: noOp}) implements BaseExpression {
  constructor(loc: Location, args: List<string>, body: Expression) {
    super({loc, args, body});
  }

  visit(visitor: Visitor): Expression {
    return visitor.fnExpression?.(this) ?? this;
  }
}

export class LetExpression extends Record<{kind: 'let', loc: Location, args: OrderedMap<string, Expression>, body: Expression}>({kind: 'let', loc: nullLocation, args: OrderedMap(), body: noOp}) implements BaseExpression {
  constructor(loc: Location, args: OrderedMap<string, Expression>, body: Expression) {
    super({loc, args, body});
  }

  visit(visitor: Visitor): Expression {
    return visitor.letExpression?.(this) ?? this;
  }
}

export class TryExpression extends Record<{kind: 'try', loc: Location, body: Expression, catchName: string, catchEx: Expression, finallyEx: Expression}>({kind: 'try', loc: nullLocation, body: noOp, catchName: '', catchEx: noOp, finallyEx: noOp}) implements BaseExpression {
  constructor(loc: Location, body: Expression, catchName: string, catchEx: Expression, finallyEx: Expression) {
    super({loc, body, catchName, catchEx, finallyEx});
  }

  visit(visitor: Visitor): Expression {
    return visitor.tryExpression?.(this) ?? this;
  }
}

export class CdExpression extends Record<{kind: 'cd', loc: Location, path: Expression, body?: Expression}>({kind: 'cd', loc: nullLocation, path: noOp}) {
  constructor(loc: Location, path: Expression, body?: Expression) {
    super({loc, path, body});
  }

  visit(visitor: Visitor): Expression {
    return visitor.cdExpression?.(this) ?? this;
  }
}

export class ExecuteExpression extends Record<{kind: 'execute', loc: Location, path: Expression, args?: Expression, options?: Expression}>({kind: 'execute', loc: nullLocation, path: noOp}) {
  constructor(loc: Location, path: Expression, args?: Expression, options?: Expression) {
    super({loc, path, args, options});
  }
  visit(visitor: Visitor): Expression {
    return visitor.executeExpression?.(this) ?? this;
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

export type Expression
  = NoOpExpression
  | SExpression
  | ListExpression
  | MapExpression
  | IfExpression
  | DefExpression
  | ExportExpression
  | ImportExpression
  | FnExpression
  | LetExpression
  | TryExpression
  | CdExpression
  | ExecuteExpression
  | ValueExpression
  | VariableExpression
  ;

export interface Visitor {
  sExpression?(ex: SExpression): Expression;
  listExpression?(ex: ListExpression): Expression;
  mapExpression?(ex: MapExpression): Expression;
  ifExpression?(ex: IfExpression): Expression;
  defExpression?(ex: DefExpression): Expression;
  exportExpression?(ex: ExportExpression): Expression;
  importExpression?(ex: ImportExpression): Expression;
  fnExpression?(ex: FnExpression): Expression;
  letExpression?(ex: LetExpression): Expression;
  tryExpression?(ex: TryExpression): Expression;
  cdExpression?(ex: CdExpression): Expression;
  executeExpression?(ex: ExecuteExpression): Expression;
  value?(ex: ValueExpression): Expression;
  variable?(ex: VariableExpression): Expression;
}
