import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Replace the external health operation, retaining real CLI registration/router.
const loader = `export async function load(url, context, nextLoad) {
  if (url.endsWith('/src/core/health.js')) {
    return { format: 'module', shortCircuit: true, source: \`
      export async function healthCheck() {
        if (process.env.STATUS_TEST_FAILURE) throw new Error(process.env.STATUS_TEST_FAILURE);
        return { success: true, cdp_connected: true, target_url: 'mock://desktop',
          chart_symbol: 'MOCK', chart_resolution: '60', api_available: true,
          endpoint: process.env.TV_CDP_HOST + ':' + process.env.TV_CDP_PORT };
      }
    \` };
  }
  return nextLoad(url, context);
}`;

function status(failure = '') {
  return spawnSync(process.execPath, [
    '--no-warnings', '--experimental-loader',
    `data:text/javascript,${encodeURIComponent(loader)}`,
    new URL('../src/cli/index.js', import.meta.url).pathname, 'status',
  ], { encoding: 'utf8', timeout: 15000, env: {
    ...process.env, STATUS_TEST_FAILURE: failure,
    TV_CDP_HOST: '127.0.0.1', TV_CDP_PORT: '9333',
  } });
}

it('native status returns the health payload and exits successfully', () => {
  const result = status();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.cdp_connected, true);
  assert.equal(payload.chart_symbol, 'MOCK');
  assert.equal(payload.endpoint, '127.0.0.1:9333');
});

it('native status reports a configured connection failure with exit 2', () => {
  const result = status('CDP connection ECONNREFUSED 127.0.0.1:9333');
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), {
    success: false, error: 'CDP connection ECONNREFUSED 127.0.0.1:9333',
  });
});

it('native status reports another thrown failure with exit 1', () => {
  const result = status('Unexpected health error');
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), {
    success: false, error: 'Unexpected health error',
  });
});
