import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Dump HTML to file', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  const content = await page.content();
  fs.writeFileSync(path.join(__dirname, 'login_page.html'), content, 'utf-8');
});
