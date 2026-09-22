import { spawnSync, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';

const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run npm run verify:v2');
const root = 'verification/v0.2';
mkdirSync(`${root}/logs`, { recursive: true });
const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const evidence = {
  startedAt: new Date().toISOString(),
  revision: git(['rev-parse', 'HEAD']),
  branch: git(['branch', '--show-current']),
  trackedDiffSha256: createHash('sha256')
    .update(git(['diff', 'HEAD']))
    .digest('hex'),
  environment: {
    platform: process.platform,
    release: os.release(),
    node: process.version,
    npm: execFileSync(process.execPath, [npm, '--version'], {
      encoding: 'utf8',
    }).trim(),
  },
  runs: [],
};
const commands = [
  ['install', ['ci']],
  ['typecheck', ['run', 'typecheck']],
  ['catalog', ['run', 'catalog:check']],
  ['tests', ['test']],
  ['build', ['run', 'build']],
  ['e2e', ['run', 'test:e2e']],
  ['safety', ['run', 'audit:safety']],
  ['secrets', ['run', 'audit:secrets']],
  ['diff', null],
  ...['Asia/Ho_Chi_Minh', 'America/New_York'].map((tz) => [
    tz.replaceAll('/', '-'),
    [
      'test',
      '--',
      'tests/domain.test.ts',
      'tests/personal-v2.test.ts',
      'tests/domain-hardening.test.ts',
      'tests/integration/personal-settings-v2.test.ts',
    ],
    tz,
  ]),
];
for (const [name, args, tz] of commands) {
  const startedAt = new Date().toISOString();
  console.log(`Running ${name}…`);
  const result = args
    ? spawnSync(process.execPath, [npm, ...args], {
        encoding: 'utf8',
        env: { ...process.env, ...(tz ? { TZ: tz } : {}) },
        maxBuffer: 20 * 1024 * 1024,
      })
    : spawnSync('git', ['diff', '--check'], { encoding: 'utf8' });
  const log = `${root}/logs/final-${name}.txt`;
  writeFileSync(log, (result.stdout ?? '') + (result.stderr ?? ''));
  evidence.runs.push({
    command: args ? `npm ${args.join(' ')}` : 'git diff --check',
    timezone: tz ?? null,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.status,
    log,
    ...(result.error ? { error: result.error.message } : {}),
  });
  writeFileSync(
    `${root}/final-runs.json`,
    JSON.stringify(evidence, null, 2) + '\n',
  );
  console.log(`${name}: ${result.status === 0 ? 'PASS' : 'FAIL'} (${log})`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
