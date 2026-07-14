import { TestInfo } from '@playwright/test';

/**
 * Tạo một chuỗi hậu tố (suffix) duy nhất dựa trên parallelIndex của worker và timestamp hiện tại.
 * Giúp cô lập dữ liệu khi chạy nhiều test case song song trên cùng một môi trường.
 */
export function getUniqueSuffix(testInfo: TestInfo): string {
  const workerIndex = testInfo.parallelIndex;
  const timestamp = Date.now().toString().slice(-6); // Lấy 6 số cuối timestamp để chuỗi không quá dài
  return `w${workerIndex}_${timestamp}`;
}

/**
 * Tạo tên thực thể duy nhất (ví dụ tên role, task, account) cho test case.
 */
export function getUniqueName(baseName: string, testInfo: TestInfo): string {
  return `${baseName}_${getUniqueSuffix(testInfo)}`;
}
