# ============================================================
# Dockerfile cho Crawler Pipeline
# Build: docker build -t crawler-pipeline .
# Run:   docker compose up -d
# ============================================================

# --- Stage 1: Base image với Node.js 18 trên Debian ---
FROM node:18-bookworm-slim AS base

# Cài các thư viện hệ thống cần cho Playwright Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Chromium dependencies
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    libatspi2.0-0 libwayland-client0 \
    # Fonts (cho render tiếng Trung/Việt)
    fonts-noto-cjk fonts-noto-color-emoji \
    # Utilities
    ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Tạo thư mục làm việc
WORKDIR /app

# --- Stage 2: Cài dependencies (cache layer) ---
COPY package.json ./

# Loại bỏ dependency "cloakbrowser" (dùng file: protocol, chỉ chạy local)
# Cài dependencies không dùng lock file (vì lock file chứa ref cloakbrowser)
RUN sed -i '/"cloakbrowser"/d' package.json && \
    npm install --omit=dev --no-package-lock

# Cài Playwright Chromium browser
RUN npx playwright install chromium

# --- Stage 3: Copy source code ---
COPY src/ ./src/
COPY tsconfig.json ./

# Tạo thư mục output
RUN mkdir -p /app/output

# --- Runtime config ---
# Bắt buộc headless trên server (không có màn hình)
ENV CRAWLER_HEADLESS=true
ENV NODE_ENV=production

# Entry point: chạy queue worker (polling task từ Supabase)
CMD ["npx", "tsx", "src/index.ts", "crawl"]
