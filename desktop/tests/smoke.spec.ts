import { test, expect, _electron as electron } from '@playwright/test';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

test('picker loads on first launch and shows built-in servers', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'revornix-e2e-'));
  const app = await electron.launch({
    args: [join(__dirname, '..', 'dist', 'main', 'main.js'), `--user-data-dir=${userData}`],
  });
  const win = await app.firstWindow();
  await expect(win.locator('h1')).toHaveText('Choose a server to connect');
  const buttons = win.locator('.server');
  await expect(buttons).toHaveCount(2);
  await expect(buttons.first()).toContainText('app.revornix.com');
  await app.close();
});
