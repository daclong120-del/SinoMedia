import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[placeholder="name@example.com"]');
    this.passwordInput = page.locator('input[placeholder="••••••••"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto(systemUrl: string): Promise<void> {
    await this.navigateTo(`${systemUrl}/login`);
  }

  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
    await this.page.waitForURL('**/dash/**', { timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }
}
