import { spawnSync } from 'node:child_process';
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run through npm run test:e2e');
for (const args of [
  ['run', 'build'],
  ['exec', '--', 'playwright', 'test', ...process.argv.slice(2)],
]) {
  const result = spawnSync(process.execPath, [npm, ...args], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_ENABLE_LIVE_AI: 'true',
      VITE_ENABLE_TEXT_EXPLANATION: 'true',
      CI: 'true',
    },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
