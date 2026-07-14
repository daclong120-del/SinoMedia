import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  private readonly apiKeyInput: Locator;

  constructor(page: Page) {
    super(page);
    // Selector tìm trường API Key (thường là type password hoặc name apiKey)
    this.apiKeyInput = page.locator('input[name="apiKey"], input[type="password"]').first();
  }

  async goto(systemUrl: string): Promise<void> {
    await this.navigateTo(`${systemUrl}/dash/settings`);
  }

  async isApiKeyMasked(): Promise<boolean> {
    try {
      await this.apiKeyInput.waitFor({ state: 'attached', timeout: 15000 });
      const value = await this.apiKeyInput.inputValue();
      // Khóa API được che dấu bằng dấu chấm tròn hoặc sao hoặc rỗng (do masking không gửi về)
      return value.includes('•') || value.includes('*') || value === '';
    } catch {
      return false;
    }
  }
}
