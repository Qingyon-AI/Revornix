import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig, writeConfig } from './store.ts';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'revornix-desktop-'));
}

test('readConfig returns null selection when file missing', () => {
  const dir = tmp();
  try {
    assert.deepEqual(readConfig(dir), { selectedOrigin: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeConfig then readConfig round-trips', () => {
  const dir = tmp();
  try {
    writeConfig(dir, { selectedOrigin: 'https://app.revornix.cn' });
    assert.deepEqual(readConfig(dir), { selectedOrigin: 'https://app.revornix.cn' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readConfig tolerates malformed json', () => {
  const dir = tmp();
  try {
    writeConfig(dir, { selectedOrigin: 'https://app.revornix.com' });
    writeFileSync(join(dir, 'config.json'), '{ not json');
    assert.deepEqual(readConfig(dir), { selectedOrigin: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
