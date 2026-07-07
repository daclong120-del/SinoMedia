"use server";
/**
 * Server Actions — Crawler (Tasks, Accounts, Logs)
 * Wrapper cho crawler.service.
 */
import {
  getTasks,
  createTask,
  createTasksBulk,
  cancelTask,
  retryTask,
  getTaskLogs,
  getAccounts,
  getTaskById,
} from "@/lib/services/crawler.service";

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
