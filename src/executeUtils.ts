import { List, Map as ImmutableMap, Set as ImmutableSet } from 'immutable';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import deasync from 'deasync';
import { RuntimeType } from './runtime.js';
import { Location } from './ast.js';

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

function executeImpl(path: string, args: string[], options: SpawnOptionsWithoutStdio, flags: ExecFlags, callback: (err: any, result?: ExecResult) => void ): void {
  const task = spawn(path, args, options);

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
const executeSync = deasync(executeImpl) as (path: string, args: string[], options: SpawnOptionsWithoutStdio, flags: ExecFlags) => ExecResult;

export function doExecute(path: string, argumentList: List<string>, flagsMap: ImmutableMap<string, string>, loc: Location, cwd: string, env: ImmutableMap<string, string>): ImmutableMap<string, RuntimeType> {
  // (execute "pathToProgram" [list of arguments] {optional map of flags})

  const outUse = flagsMap.get('out') ?? 'keep';
  const errUse = flagsMap.get('err') ?? 'forward';

  if (!verifyExecStreamOptions(outUse)) {
    return loc.fail('execute argument "out" is invalid. Valid options are: "ignore", "keep", or "forward"');
  }

  if (!verifyExecStreamOptions(errUse)) {
    return loc.fail('execute argument "err" is invalid. Valid options are: "ignore", "keep", or "forward"');
  }

  const result = executeSync(path, argumentList.toArray(), {cwd, env: Object.fromEntries(env)}, {out: outUse, err: errUse});

  return ImmutableMap(result);
}

function verifyExecStreamOptions(arg: RuntimeType): arg is ExecStreamOptions {
  return execStreamOptions.contains(arg as ExecStreamOptions);
}
