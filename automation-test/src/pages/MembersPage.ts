import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MembersPage extends BasePage {
  private readonly rolesTabButton: Locator;
  private readonly adminRoleItem: Locator;
  private readonly userRoleItem: Locator;
  private readonly deleteRoleButton: Locator;

  constructor(page: Page) {
    super(page);
    this.rolesTabButton = page.locator('button:has-text("Vai trò & Quyền hạn"), button:has-text("Roles"), button:has-text("Quyền hạn")').first();
    this.adminRoleItem = page.locator('div:has-text("Admin")').first();
    this.userRoleItem = page.locator('div:has-text("User")').first();
    this.deleteRoleButton = page.locator('button:has-text("Xóa vai trò")');
  }

  async goto(systemUrl: string): Promise<void> {
    await this.navigateTo(`${systemUrl}/dash/manage-account/members`);
  }

  async clickRolesTab(): Promise<void> {
    await this.click(this.rolesTabButton);
    // Chờ tab roles load xong (thay thế waitForTimeout)
    await this.adminRoleItem.waitFor({ state: 'visible' });
  }

  async selectAdminRole(): Promise<void> {
    await this.click(this.adminRoleItem);
  }

  async selectUserRole(): Promise<void> {
    await this.click(this.userRoleItem);
  }

  async isDeleteButtonVisible(): Promise<boolean> {
    return await this.deleteRoleButton.isVisible();
  }
}
