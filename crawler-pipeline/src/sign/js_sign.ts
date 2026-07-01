import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const jsPath = join(process.cwd(), "src", "sign", "douyin.js");
const jsCode = readFileSync(jsPath, "utf-8");

const context = vm.createContext({
  console,
  Date,
  Math,
  String,
  Array,
  Object,
  decodeURIComponent,
  encodeURIComponent,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
});

vm.runInContext(jsCode, context);

/**
 * # Tính toán chữ ký a_bogus cho API xem chi tiết video Douyin
 */
export function signDetail(params: string, userAgent: string): string {
  return vm.runInContext(`sign_datail(${JSON.stringify(params)}, ${JSON.stringify(userAgent)})`, context);
}

/**
 * # Tính toán chữ ký a_bogus cho API xem bình luận Douyin
 */
export function signReply(params: string, userAgent: string): string {
  return vm.runInContext(`sign_reply(${JSON.stringify(params)}, ${JSON.stringify(userAgent)})`, context);
}
