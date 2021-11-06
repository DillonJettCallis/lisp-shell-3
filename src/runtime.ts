import { List, Map as ImmutableMap, Seq } from 'immutable';
import { Location } from './ast';
import { MacroFunction, NormalFunction } from './interpreter';
import { OsHandler } from './os';

export type RuntimeType = string | boolean | number | null | MacroFunction | NormalFunction | List<RuntimeType> | Seq<unknown, RuntimeType> | ImmutableMap<RuntimeType, RuntimeType>


/**
 * Scopes
 *
 *
 * Global - All builtins. Immutable. Extends nothing.
 * Inherited Env scope - All environment variables as pass in. Immutable. Extends Global
 * Path scope - all functions from the path. Can be reset, but there is no other way to mutate it. Extends Inherited Env.
 * Env scope - everything exported from the shell. Extends Path
 *
 * Shell scope - holds results, everything defined in the shell and exports go to Env scope. Extends Env.
 * Lib scope - holds defs and exports separately. Extends Env.
 *
 * Local scope - only holds function parameters and let vars Extends Lib, Shell or Local.
 *
 *
 */


export interface Scope {
  lookup(name: string, loc: Location): RuntimeType;
}

export class GlobalScope implements Scope {
  // globals have no boxes and are the only level that are totally immutable
  constructor(private readonly dict: ImmutableMap<string, RuntimeType>) {
  }

  lookup(name: string, loc: Location): RuntimeType {
    const maybe = this.dict.get(name);

    if (maybe === undefined) {
      loc.fail(`Undefined variable ${name}`);
    } else {
      return maybe;
    }
  }

  createEnvironment(): EnvironmentScope {
    return new EnvironmentScope(this);
  }
}

export class EnvironmentScope implements Scope {
  private readonly dict = new Map<string, RuntimeType>();

  constructor(private readonly parent: GlobalScope | EnvironmentScope) {
  }

  export(name: string, value: RuntimeType): void {
    this.dict.set(name, value);
  }

  allDefs(): List<string> {
    return List(this.dict.keys());
  }

  clear(): void {
    this.dict.clear();
  }

  /**
   * Only to be used internally - does NOT do a recursive look up the chain.
   * @param name
   */
  check(name: string): RuntimeType | undefined {
    return this.dict.get(name);
  }

  lookup(name: string, loc: Location): RuntimeType {
    const maybe = this.dict.get(name);

    if (maybe === undefined) {
      return this.parent.lookup(name, loc);
    } else {
      return maybe;
    }
  }

  createEnvironment(): EnvironmentScope {
    return new EnvironmentScope(this);
  }

  createShell(): ShellScope {
    return new ShellScope(this);
  }

  createLib(): LibScope {
    return new LibScope(this);
  }
}

export class ShellScope implements Scope {
  private readonly dict = new Map<string, RuntimeType>();

  constructor(private readonly parent: EnvironmentScope) {
  }

  define(name: string, value: RuntimeType): void {
    this.dict.set(name, value);
  }

  export(name: string, value: RuntimeType): void {
    this.parent.export(name, value);
  }

  clear(): void {
    this.dict.clear();
  }

  delete(name: string): void {
    this.dict.delete(name);
  }

  allDefs(): List<string> {
    return List(this.dict.keys());
  }

  lookup(name: string, loc: Location): RuntimeType {
    const maybe = this.dict.get(name);

    if (maybe === undefined) {
      return this.parent.lookup(name, loc);
    } else {
      return maybe;
    }
  }

  childScope(): LocalScope {
    return new LocalScope(this);
  }
}

export class LibScope implements Scope {
  private readonly exports = new Map<string, RuntimeType>();
  private readonly defs = new Map<string, RuntimeType>();

  constructor(private readonly parent: EnvironmentScope) {
  }

  define(name: string, value: RuntimeType): void {
    this.defs.set(name, value);
  }

  export(name: string, value: RuntimeType): void {
    this.exports.set(name, value);
  }

  import(name: string, loc: Location): RuntimeType {
    const maybe = this.exports.get(name);

    if (maybe === undefined) {
      return loc.fail(`Cannot import ${name} as it is not exported`);
    }

    return maybe;
  }

  importAll(): List<[string, RuntimeType]> {
    return List(this.exports);
  }

  lookup(name: string, loc: Location): RuntimeType {
    const maybe = this.defs.get(name);

    if (maybe === undefined) {
      // check exports as well
      const maybeExport = this.exports.get(name);

      if (maybeExport === undefined) {
        return this.parent.lookup(name, loc);
      } else {
        return maybeExport;
      }
    } else {
      return maybe;
    }
  }

  childScope(): LocalScope {
    return new LocalScope(this);
  }
}

export class LocalScope {
  private readonly dict = new Map<string, RuntimeType>();

  constructor(private readonly parent: ShellScope | LibScope | LocalScope) {
  }

  // use with a let or a function parameter
  let(name: string, value: RuntimeType): void {
    this.dict.set(name, value);
  }

  // use only with import, export, def or it's kind
  define(name: string, value: RuntimeType): void {
    this.parent.define(name, value);
  }

  export(name: string, value: RuntimeType): void {
    this.parent.export(name, value);
  }

  // only use internally for the shell or the like
  clear(): void {
    this.dict.clear();
  }

  lookup(name: string, loc: Location): RuntimeType {
    const maybe = this.dict.get(name);

    if (maybe === undefined) {
      if (this.parent == undefined) {
        loc.fail(`Undefined variable ${name}`);
      } else {
        return this.parent.lookup(name, loc);
      }
    } else {
      return maybe;
    }
  }

  childScope(): LocalScope {
    return new LocalScope(this);
  }
}


