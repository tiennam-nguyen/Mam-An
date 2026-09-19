import { readFileSync } from 'node:fs';
import { readServerConfig } from '../server/config/serverConfig';
const example = Object.fromEntries(
  readFileSync('.env.example', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
const result = readServerConfig(example);
if (!result.success) throw new Error('Invalid example provider config');
console.log('Placeholder config valid. No provider request sent.');
console.log('Groq model: ' + result.data.GROQ_VISION_MODEL);
console.log('OpenRouter model: ' + result.data.OPENROUTER_VISION_MODEL);
console.log(
  'This config-only check does not verify live access; see verification/live-provider-spike.json for separate smoke results.',
);
