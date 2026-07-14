import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TasksPage extends BasePage {
  private readonly titleHeading: Locator;
  private readonly tasksTable: Locator;

  constructor(page: Page) {
    super(page);
    this.titleHeading = page.locator('h1:has-text("Chiến dịch & Nhiệm vụ")');
    this.tasksTable = page.locator('table');
  }

  async goto(systemUrl: string): Promise<void> {
    await this.navigateTo(`${systemUrl}/dash/tasks`);
  }

  async isTitleVisible(): Promise<boolean> {
    try {
      await this.titleHeading.waitFor({ state: 'visible', timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  async isTableVisible(): Promise<boolean> {
    try {
      await this.tasksTable.waitFor({ state: 'visible', timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }
}
