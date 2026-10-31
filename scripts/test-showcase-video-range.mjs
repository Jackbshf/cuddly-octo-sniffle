import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const source = new TextEncoder().encode('0123456789');
function asset(withLength = true) {
  let offset = 0;
  const body = new ReadableStream({ async pull(c) { await new Promise(r => setTimeout(r, 30)); if (offset >= source.length) { c.close(); return; } c.enqueue(source.slice(offset, offset + 2)); offset += 2; } });
  const headers = { 'Content-Type': 'video/mp4', ETag: '"test"' };
  if (withLength) headers['Content-Length'] = String(source.length);
  return new Response(body, { headers });
}
async function check(range, status, expected, contentRange, options = {}) {
  const headers = range ? { Range: range } : {};
  if (options.ifRange) headers['If-Range'] = options.ifRange;
  const start = performance.now();
  const response = await worker.fetch(new Request('https://example.com/showcase/videos/test.mp4', { headers }), { ASSETS: { fetch: () => Promise.resolve(asset(options.withLength !== false)) } });
  const responseMs = performance.now() - start;
  assert.equal(response.status, status);
  if (contentRange) assert.equal(response.headers.get('Content-Range'), contentRange);
  assert.equal(await response.text(), expected);
  if (options.streamed) assert.ok(responseMs < 120, `headers delayed ${responseMs}ms`);
  console.log(`${range || 'full'}: ${status}, headers ${Math.round(responseMs)}ms`);
}
await check('bytes=0-', 206, '0123456789', 'bytes 0-9/10', { streamed: true });
await check('bytes=2-5', 206, '2345', 'bytes 2-5/10', { streamed: true });
await check('bytes=7-', 206, '789', 'bytes 7-9/10', { streamed: true });
await check('bytes=-3', 206, '789', 'bytes 7-9/10', { streamed: true });
await check('bytes=20-', 416, '', 'bytes */10');
await check('bytes=0-1', 200, '0123456789', null, { ifRange: '"other"', streamed: true });
await check('bytes=2-5', 206, '2345', 'bytes 2-5/10', { withLength: false });
