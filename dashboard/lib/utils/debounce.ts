/**
 * Hàm trì hoãn thực thi (debounce) một function.
 * Giúp gom nhiều lượt gọi liên tiếp trong khoảng thời gian `wait` thành một lần gọi duy nhất ở cuối.
 * 
 * @param func Function cần debounce
 * @param wait Thời gian chờ (milliseconds)
 * @returns Phiên bản debounced của function truyền vào
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    const context = this;

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}
