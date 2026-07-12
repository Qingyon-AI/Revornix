import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILTIN_SERVERS,
  OAUTH_HOSTS,
  normalizeServerUrl,
  isInternalNavigation,
} from './servers.ts';

test('built-in servers are the two official mirrors', () => {
  assert.deepEqual(
    BUILTIN_SERVERS.map((s) => s.origin),
    ['https://app.revornix.com', 'https://app.revornix.cn'],
  );
});

test('normalizeServerUrl accepts https and strips path', () => {
  assert.equal(normalizeServerUrl('https://app.revornix.com/dashboard'), 'https://app.revornix.com');
  assert.equal(normalizeServerUrl('https://self.example.org'), 'https://self.example.org');
});

test('normalizeServerUrl accepts http only for localhost', () => {
  assert.equal(normalizeServerUrl('http://localhost:3000'), 'http://localhost:3000');
  assert.equal(normalizeServerUrl('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
  assert.equal(normalizeServerUrl('http://evil.example.org'), null);
});

test('normalizeServerUrl rejects junk', () => {
  assert.equal(normalizeServerUrl('not-a-url'), null);
  assert.equal(normalizeServerUrl('ftp://app.revornix.com'), null);
  assert.equal(normalizeServerUrl(''), null);
});

test('isInternalNavigation keeps same-origin in window', () => {
  assert.equal(isInternalNavigation('https://app.revornix.com/section/1', 'https://app.revornix.com'), true);
});

test('isInternalNavigation keeps oauth hosts in window', () => {
  for (const host of OAUTH_HOSTS) {
    assert.equal(isInternalNavigation(`https://${host}/authorize?x=1`, 'https://app.revornix.com'), true);
  }
});

test('isInternalNavigation pushes foreign links out', () => {
  assert.equal(isInternalNavigation('https://example.com/doc', 'https://app.revornix.com'), false);
});
