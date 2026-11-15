import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCsv } from '../dist/parsers/csv.js';
import { parseLinkedInExport } from '../dist/parse.js';
import { normalizePositions } from '../dist/normalizers/positions.js';
import { hashContent } from '../dist/writers/hash.js';
import { makeZip } from './build-fixture.mjs';

test('CSV preserves quoted commas, quotes and newlines and strips BOM', () => {
  assert.deepEqual(parseCsv('\ufeffName,Description\r\nAda,"Hello, ""world""\r\nSecond line"\r\n\r\n'), [{ Name: 'Ada', Description: 'Hello, "world"\r\nSecond line' }]);
});

test('CSV supports CR, LF and CRLF record separators and missing cells', () => {
  for (const sep of ['\r', '\n', '\r\n']) {
    assert.deepEqual(parseCsv(`Name,Role${sep}Ada,Engineer${sep}Bob`), [{ Name: 'Ada', Role: 'Engineer' }, { Name: 'Bob', Role: '' }]);
  }
  assert.deepEqual(parseCsv(''), []);
});

test('normalizes alternate position headers and current roles', () => {
  const [position] = normalizePositions([{ Position: 'Engineer', Company: 'Acme', 'Start Date': 'January 2024', 'End Date': 'Present' }]);
  assert.equal(position.title, 'Engineer');
  assert.deepEqual(position.dates, { start: '2024-01', end: null, current: true });
});

test('hashes ignore object key order but preserve array order', () => {
  assert.equal(hashContent({ b: { x: 1, a: 2 }, a: 3 }), hashContent({ a: 3, b: { a: 2, x: 1 } }));
  assert.notEqual(hashContent([1, 2]), hashContent([2, 1]));
});

test('export parser discovers either volunteer filename and prefers the canonical name', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'linkedin-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const zipPath = join(dir, 'export.zip');
  for (const name of ['Volunteering.csv', 'Volunteer Experience.csv']) {
    await writeFile(zipPath, makeZip([{ name, content: 'Organization,Role,Start Date,End Date\nFoundation,Volunteer,2024,Present\n' }]));
    const parsed = await parseLinkedInExport({ zipPath });
    assert.equal(parsed.volunteer.length, 1);
    assert.equal(parsed.volunteer[0].organization, 'Foundation');
    assert.deepEqual(parsed.positions, []);
  }
  await writeFile(zipPath, makeZip([{ name: 'Volunteering.csv', content: 'Organization\nCanonical' }, { name: 'Volunteer Experience.csv', content: 'Organization\nFallback' }]));
  assert.equal((await parseLinkedInExport({ zipPath })).volunteer[0].organization, 'Canonical');
});
