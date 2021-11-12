import { List, Map as ImmutableMap, Seq } from 'immutable';
import { Location } from './ast.js';
import { markNormal, NormalFunction } from './interpreter.js';
import { chooseOs } from './os.js';

export type RuntimeType = string | boolean | number | null | NormalFunction | List<RuntimeType> | Seq<unknown, RuntimeType> | ImmutableMap<RuntimeType, RuntimeType>


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

const os = chooseOs();

export class EnvironmentScope implements Scope {
  private readonly externalEnv = os.loadEnv();
  private pathed = ImmutableMap<string, NormalFunction>();
  private readonly dict = new Map<string, string>();

  constructor(private readonly parent: GlobalScope | EnvironmentScope) {
  }

  loadEnv(): void {
    const path = os.pathVar();
    this.pathed = os.loadPath(path);

    this.dict.set('PATH', path);
    this.dict.set('cwd', process.cwd());
  }

  private reloadPath(path: string): void {
    this.pathed = os.loadPath(path);
  }

  export(name: string, value: RuntimeType, loc: Location): void {
    if (typeof value !== 'string') {
      return loc.fail('Cannot export anything but a string from the shell');
    }

    if (name === 'PATH') {
      this.reloadPath(value);
    }

    this.dict.set(name, value);
  }

  listPath(): List<string> {
    return List(this.pathed.keys())
  }

  get cwd(): string {
    const cwd = this.dict.get('cwd');

    if (typeof cwd !== 'string') {
      throw new Error("Something is wrong. The 'cwd' variable wasn't found or it's not a string")
    }

    return cwd;
  }

  set cwd(dir: string) {
    this.dict.set('cwd', dir);
  }

  lookup(name: string, loc: Location): RuntimeType {
    // check all three places, in order. dict, then pathed, then external
    const maybe = this.dict.get(name);

    if (maybe !== undefined) {
      return maybe;
    }

    const maybePath = this.pathed.get(name);

    if (maybePath !== undefined) {
      return maybePath;
    }

    const maybeEnv = this.externalEnv.get(name);

    if (maybeEnv !== undefined) {
      return maybeEnv;
    }

    return this.parent.lookup(name, loc);
  }

  environment(): { cwd: string, env: ImmutableMap<string, string> } {
    const cwd = this.cwd;

    const env = ImmutableMap(this.dict).concat(this.externalEnv)

    return { cwd, env };
  }

  createShell(): ShellScope {
    return new ShellScope(this);
  }

  createLib(fileSourceDir: string): LibScope {
    return new LibScope(this, fileSourceDir);
  }
}

export class ShellScope implements Scope {
  private readonly builtIns = this.constructBuiltIns();
  private readonly results = new Map<string, RuntimeType>();
  private readonly defs = new Map<string, RuntimeType>();

  private resultIndex = 0;
  private exit = false;

  constructor(private readonly parent: EnvironmentScope) {
  }

  get exitFlag(): boolean {
    return this.exit;
  }

  define(name: string, value: RuntimeType): void {
    this.defs.set(name, value);
  }

  export(name: string, value: RuntimeType, loc: Location): void {
    this.parent.export(name, value, loc);
  }

  result(value: RuntimeType): string {
    const id = `result${this.resultIndex++}`;
    this.results.set(id, value);
    return id;
  }

  lookup(name: string, loc: Location): RuntimeType {
    const maybe = this.defs.get(name);

    if (maybe !== undefined) {
      return maybe;
    }

    const maybeResult = this.results.get(name);

    if (maybeResult !== undefined) {
      return maybeResult;
    }

    const maybeBuiltin = this.builtIns.get(name);

    if (maybeBuiltin !== undefined) {
      return maybeBuiltin;
    }

    return this.parent.lookup(name, loc);
  }

  environment(): EnvironmentScope {
    return this.parent;
  }

  moduleScope(): LibScope | ShellScope {
    return this;
  }

  childScope(): LocalScope {
    return new LocalScope(this);
  }

  private constructBuiltIns(): ImmutableMap<string, RuntimeType> {
    return ImmutableMap({
      exit: markNormal(() => {
        this.exit = true;
        return null;
      }),
      clearResults: markNormal(() => {
        this.results.clear();
        this.resultIndex = 0;
        return null;
      }),
      clearDefs: markNormal(() => {
        this.defs.clear();
        return null;
      }),
      listDefs: markNormal(() => List(this.defs.keys())),
      listPath: markNormal(() => this.parent.listPath()),
    });
  }
}

export class LibScope implements Scope {
  private readonly exports = new Map<string, RuntimeType>();
  private readonly defs = new Map<string, RuntimeType>();

  constructor(private readonly parent: EnvironmentScope, public readonly fileSourceDir: string) {
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

  environment(): EnvironmentScope {
    return this.parent;
  }

  moduleScope(): LibScope | ShellScope {
    return this;
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

  export(name: string, value: RuntimeType, loc: Location): void {
    this.parent.export(name, value, loc);
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

  moduleScope(): LibScope | ShellScope {
    return this.parent.moduleScope();
  }

  childScope(): LocalScope {
    return new LocalScope(this);
  }
}


