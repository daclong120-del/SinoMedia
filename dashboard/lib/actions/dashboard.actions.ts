"use server";
/**
 * Server Actions — Dashboard
 * Wrapper cho dashboard.service, cho phép "use client" component gọi server-side.
 */
import {
  getDashboardMetrics,
  getPlatformDistribution,
  getPostsPerDay,
  getPlatformHealth,
} from "@/lib/services/dashboard.service";

export {
  getDashboardMetrics,
  getPlatformDistribution,
  getPostsPerDay,
  getPlatformHealth,
};
