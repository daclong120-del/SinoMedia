"use server";
/**
 * Server Actions — System (Proxies, Audit, Exports)
 * Wrapper cho system.service.
 * 
 * LƯU Ý: getSettings/saveSettings dùng localStorage (browser-only)
 * → KHÔNG export ở đây. Import trực tiếp từ system.service.
 */
import {
  getProxies,
  createProxies,
  deleteProxy,
  testProxy,
  getAuditLogs,
  logAuditEvent,
  getExports,
  logExport,
} from "@/lib/services/system.service";

export {
  getProxies,
  createProxies,
  deleteProxy,
  testProxy,
  getAuditLogs,
  logAuditEvent,
  getExports,
  logExport,
};
