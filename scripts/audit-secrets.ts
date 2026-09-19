import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { hasNonemptyProviderKeys } from './envTemplate';
const git = (args: string[]) =>
  execFileSync('git', ['-c', 'safe.directory=C:/Users/LOQ/Mam An', ...args], {
    encoding: 'utf8',
  });
const files = git([
  'ls-files',
  '--cached',
  '--others',
  '--exclude-standard',
  '-z',
])
  .split('\0')
  .filter(Boolean);
const walk = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(directory, entry.name))
      : [join(directory, entry.name)],
  );
let local = '';
try {
  local = readFileSync('.env.local', 'utf8');
} catch {
  /* Local credentials are optional. */
}
const secrets = local.split(/\r?\n/).flatMap((line) => {
  const match = /^(?:GROQ_API_KEY|OPENROUTER_API_KEY)=(.*)$/.exec(line);
  const value = match?.[1]?.trim().replace(/^(['"])(.*)\1$/, '$2');
  return value && value.length >= 8 ? [value] : [];
});
for (const file of [...new Set([...files, ...walk('dist')])]) {
  const contents = readFileSync(file);
  if (secrets.some((secret) => contents.includes(Buffer.from(secret))))
    throw new Error('Credential content found in ' + file);
}
if (hasNonemptyProviderKeys(readFileSync('.env.example', 'utf8')))
  throw new Error('Template contains a nonempty key');
for (const commit of git(['rev-list', '--all', '--', '.env.example'])
  .trim()
  .split('\n')
  .filter(Boolean)) {
  const contents = git(['show', commit + ':.env.example']);
  if (hasNonemptyProviderKeys(contents))
    throw new Error('Nonempty key in committed template history');
}
console.log(
  'Credential audit passed: working source, built client and committed template history. No secret values printed.',
);
