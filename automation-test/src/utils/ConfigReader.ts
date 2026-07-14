import * as dotenv from 'dotenv';
import * as path from 'path';

// Đọc cấu hình từ file .env nếu có
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export class ConfigReader {
  static get baseUrl(): string {
    return process.env.BASE_URL || 'http://localhost:3000';
  }

  static get testUserEmail(): string {
    if (!process.env.TEST_USER_EMAIL) {
      throw new Error('Biến môi trường TEST_USER_EMAIL chưa được cấu hình trong file .env');
    }
    return process.env.TEST_USER_EMAIL;
  }

  static get testUserPassword(): string {
    if (!process.env.TEST_USER_PASSWORD) {
      throw new Error('Biến môi trường TEST_USER_PASSWORD chưa được cấu hình trong file .env');
    }
    return process.env.TEST_USER_PASSWORD;
  }

  static get headless(): boolean {
    return process.env.HEADLESS !== 'false';
  }
}
