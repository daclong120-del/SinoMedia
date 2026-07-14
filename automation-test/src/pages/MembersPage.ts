import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MembersPage extends BasePage {
  private readonly membersNavLink: Locator;
  private readonly membersHeading: Locator;
  private readonly rolesTabButton: Locator;
  private readonly adminRoleItem: Locator;
  private readonly userRoleItem: Locator;
  private readonly deleteRoleButton: Locator;

  constructor(page: Page) {
    super(page);
    this.membersNavLink = page.getByRole('link', { name: /Quản lý thành viên/i }).first();
    this.membersHeading = page.getByRole('heading', { name: /Quản lý thành viên/i }).first();
    this.rolesTabButton = page.getByRole('button', { name: /Vai trò/i }).first();
    this.adminRoleItem = page.getByRole('button', { name: /admin/i }).first();
    this.userRoleItem = page.getByRole('button', { name: /user/i }).first();
    this.deleteRoleButton = page.getByRole('button', { name: /Xóa vai trò/i });
  }

  async goto(systemUrl: string): Promise<void> {
    await this.navigateTo(`${systemUrl}/dash/manage-account/members`);
    this.assertNotUnauthorized();

    if (!(await this.isMembersPageVisible())) {
      await this.click(this.membersNavLink);
      await this.page.waitForLoadState('networkidle');
      this.assertNotUnauthorized();
    }

    if (!(await this.isMembersPageVisible(10000))) {
      throw new Error(`Members page did not render after navigation. Current URL: ${this.page.url()}. Check TEST_USER_EMAIL permissions for /dash/manage-account/members.`);
    }
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

  private async isMembersPageVisible(timeout = 5000): Promise<boolean> {
    try {
      await this.membersHeading.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  private assertNotUnauthorized(): void {
    if (this.page.url().includes('error=unauthorized')) {
      throw new Error('Test user is not authorized to access /dash/manage-account/members. Grant members/admin permission or change TEST_USER_EMAIL.');
    }
  }
}
