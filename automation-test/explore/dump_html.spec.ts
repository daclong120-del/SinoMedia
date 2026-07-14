import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Dump HTML to file', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  const content = await page.content();
  const evidenceDir = path.resolve(__dirname, '../evidence/requirements');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  fs.writeFileSync(path.join(evidenceDir, 'login_page.html'), content, 'utf-8');
});
