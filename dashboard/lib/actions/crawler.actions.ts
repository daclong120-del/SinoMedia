"use server";
/**
 * Server Actions — Crawler (Tasks, Accounts, Logs)
 * Wrapper cho crawler.service.
 */
import { requireAdmin } from "@/lib/supabase/auth-helper";
import {
  getTasks,
  createTask,
  createTasksBulk,
  cancelTask,
  retryTask,
  getTaskLogs,
  getAccounts,
  getTaskById,
  createAccount as createAccountService,
  unbanAccount as unbanAccountService,
  deleteAccount as deleteAccountService,
} from "@/lib/services/crawler.service";

export async function createAccount(
  platform: string,
  username: string,
  cookieData: string,
  proxyStr?: string | null
): Promise<void> {
  await requireAdmin();
  await createAccountService(platform, username, cookieData, proxyStr);
}

export async function unbanAccount(id: string): Promise<void> {
  await requireAdmin();
  await unbanAccountService(id);
}

export async function deleteAccount(id: string): Promise<void> {
  await requireAdmin();
  await deleteAccountService(id);
}

export {
  getTasks,
  createTask,
  createTasksBulk,
  cancelTask,
  retryTask,
  getTaskLogs,
  getAccounts,
  getTaskById,
};
