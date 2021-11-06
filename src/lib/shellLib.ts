import { GlobalScopeBuilder } from './coreLib';
import { isList, isMap as isImmutableMap, List, Map as ImmutableMap, Set as ImmutableSet } from 'immutable';
import { Location } from '../ast';
import { RuntimeType } from '../runtime';
import { spawn } from 'child_process';
import deasync from 'deasync';
import { markNormal, NormalFunction } from '../interpreter';

export function initShellLib(builder: GlobalScopeBuilder): void {
  builder.addFunction('execute', execute);
  builder.addFunction('@', buildShellFunction);
}

function buildShellFunction(args: List<RuntimeType>, loc: Location): RuntimeType {
  if (args.size !== 1) {
    return loc.fail('Expected exactly 1 argument to @ function');
  }

  const path = args.first()!;

  if (typeof path !== 'string') {
    return loc.fail('Expected only argument to @ function to be a string');
  }

  return doBuildShellFunction(path);
}

/**
 * Build a shell function out of a file path to an executable file.
 * @param path
 */
export function doBuildShellFunction(path: string): NormalFunction {
  const result: NormalFunction = ((realArgs, loc) => {
    return execute(List([path, realArgs]), loc).get('stdout') ?? null;
  });

  markNormal(result);
  return result;
}

type ExecStreamOptions = 'ignore' | 'keep' | 'forward';
const execStreamOptions: ImmutableSet<ExecStreamOptions> = ImmutableSet(['ignore', 'keep', 'forward']);

interface ExecResult {
  stdout: string | undefined;
  stderr: string | undefined;
  errCode: number;
}

interface ExecFlags {
  out: ExecStreamOptions;
  err: ExecStreamOptions;
}

function executeImpl(path: string, args: string[], flags: ExecFlags, callback: (err: any, result?: ExecResult) => void ): void {
  const task = spawn(path, args);

  let out: string | undefined;
  let err: string | undefined;

  if (flags.out === 'keep') {
    out = '';

    task.stdout.on('data', data => {
      out += String(data);
    });
  }

  if (flags.out === 'forward') {
    task.stdout.pipe(process.stderr);
  }

  if (flags.err === 'keep') {
    err = '';

    task.stderr.on('data', data => {
      err += String(data);
    });
  }

  if (flags.err === 'forward') {
    task.stderr.pipe(process.stderr);
  }

  task.on('error', err => {
    callback(err);
  });

  task.on('close', code => {
    if (code == null) {
      callback(new Error('Execution of shell command failed.'));
      return;
    }

    const result: ExecResult = {
      stdout: out,
      stderr: err,
      errCode: code,
    };

    callback(null, result);
  });
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const executeSync = deasync(executeImpl) as (path: string, args: string[], flags: ExecFlags) => ExecResult;


function execute(args: List<RuntimeType>, loc: Location): ImmutableMap<string, RuntimeType> {
  // (shell/exec "pathToProgram" [list of arguments] {optional map of flags})

  if (args.isEmpty()) {
    loc.fail('shell/exec requires at least one argument');
  }

  const [path, argumentList = List(), flagsMap = ImmutableMap()] = args;

  if (typeof path !== 'string') {
    return loc.fail('Expected first argument to shell/exec to be a path to the program to run');
  }

  if (!isList(argumentList)) {
    return loc.fail('Expected second argument to shell/exec to be a list of arguments to the program');
  }

  if (!isImmutableMap(flagsMap)) {
    return loc.fail('Expected third argument to shell/exec to be a map of flags');
  }

  const outUse = flagsMap.get('out') ?? 'keep';
  const errUse = flagsMap.get('err') ?? 'forward';

  if (!verifyExecStreamOptions(outUse)) {
    return loc.fail('shell/exec argument "out" is invalid. Valid options are: "ignore", "keep", or "forward"');
  }

  if (!verifyExecStreamOptions(errUse)) {
    return loc.fail('shell/exec argument "err" is invalid. Valid options are: "ignore", "keep", or "forward"');
  }

  const stringifyArgs = argumentList.map(it => String(it)).toArray();

  const result = executeSync(path, stringifyArgs, {out: outUse, err: errUse});

  return ImmutableMap(result);
}

function verifyExecStreamOptions(arg: RuntimeType): arg is ExecStreamOptions {
  return execStreamOptions.contains(arg as ExecStreamOptions);
}
