import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeStructuredJson } from '../dist/writers/json.js';

async function file(t) {
  const dir = await mkdtemp(join(tmpdir(), 'linkedin-writer-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return join(dir, 'data.json');
}

test('structured JSON creates, skips unchanged and updates objects and arrays', async (t) => {
  for (const [before, after] of [[{ name: 'Ada' }, { name: 'Bob' }], [[{ name: 'Ada' }], [{ name: 'Bob' }]]]) {
    const path = await file(t);
    assert.equal((await writeStructuredJson(path, before)).type, 'created');
    assert.equal((await writeStructuredJson(path, before)).type, 'unchanged');
    assert.equal((await writeStructuredJson(path, after)).type, 'updated');
    const data = JSON.parse(await readFile(path, 'utf8'));
    assert.deepEqual(Array.isArray(after) ? data.value : { name: data.name }, after);
  }
});

test('structured JSON preserves manual edits, locked and malformed files unless forced', async (t) => {
  const path = await file(t);
  await writeStructuredJson(path, { name: 'Ada' });
  const data = JSON.parse(await readFile(path, 'utf8'));
  data.name = 'Manually edited';
  await writeFile(path, JSON.stringify(data));
  assert.equal((await writeStructuredJson(path, { name: 'Bob' })).type, 'skipped-manual-edit');
  data._sync.locked = true;
  await writeFile(path, JSON.stringify(data));
  assert.equal((await writeStructuredJson(path, { name: 'Bob' })).type, 'skipped-locked');
  for (const content of ['{broken', 'null', '[]', '42', '{}', '{"name":"Untracked manual data"}']) {
    await writeFile(path, content);
    assert.equal((await writeStructuredJson(path, { name: 'Bob' })).type, 'skipped-manual-edit');
    assert.equal(await readFile(path, 'utf8'), content);
    assert.equal((await writeStructuredJson(path, { name: 'Bob' }, { force: true })).type, 'updated');
  }
});

test('dry runs do not create or update files', async (t) => {
  const path = await file(t);
  assert.equal((await writeStructuredJson(path, { name: 'Ada' }, { dryRun: true })).type, 'created');
  await assert.rejects(readFile(path), { code: 'ENOENT' });
  await writeStructuredJson(path, { name: 'Ada' });
  const before = await readFile(path, 'utf8');
  assert.equal((await writeStructuredJson(path, { name: 'Bob' }, { dryRun: true })).type, 'updated');
  assert.equal(await readFile(path, 'utf8'), before);
});
