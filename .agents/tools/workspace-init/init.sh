#!/usr/bin/env bash
# init.sh — Tạo khung workspace trong .agents CỦA DỰ ÁN theo skills/workspace.md.
# Tạo <dự-án>/.agents/docs + <dự-án>/.agents/plans (INDEX toàn cục — không có STATE). Không đè file đã có.
# Initiative (plans/<loại>-<slug>/) KHÔNG tạo sẵn — skill tạo theo nhu cầu khi có việc mới.
# Dùng: init.sh [đường-dẫn-dự-án]   (mặc định: thư mục hiện tại)
set -o pipefail

PROJECT_ROOT="${1:-$(pwd)}"
if [[ ! -d "$PROJECT_ROOT" ]]; then
    echo "Không phải thư mục: $PROJECT_ROOT" >&2
    exit 1
fi
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"
NAME="$(basename "$PROJECT_ROOT")"
DOCS="$PROJECT_ROOT/.agents/docs"
PLANS="$PROJECT_ROOT/.agents/plans"
TODAY="$(date +%F 2>/dev/null || echo '<YYYY-MM-DD>')"

mkdir -p "$DOCS" "$PLANS"

# Ghi file nếu CHƯA tồn tại (không đè), rồi thay token __NAME__/__DATE__
w() {
    local path="$1"
    if [[ -e "$path" ]]; then echo "• bỏ qua (đã có): ${path#$PROJECT_ROOT/}"; cat >/dev/null; return; fi
    cat > "$path"
    sed -i "s|__NAME__|$NAME|g; s|__DATE__|$TODAY|g" "$path"
    echo "✓ tạo: ${path#$PROJECT_ROOT/}"
}

w "$PLANS/INDEX.md" <<'EOF'
# 🗂️ INDEX — Initiatives của __NAME__   (cổng vào toàn cục — đọc đầu mỗi lượt)

| Initiative | Loại | Trạng thái | Tiến độ |
|---|---|---|---|

> Chưa có initiative nào. Khi có việc mới: phân loại (feat- / refactor- / debug-)
> → tạo thư mục plans/<loại>-<slug>/ → thêm 1 dòng vào bảng trên.
> Marker: ⏳ chưa · 🔄 đang làm · ✅ xong · ⛔ chặn
> Initiative đang 🔄 = đang active — mở roadmap.md (mục 📍 Đang làm) / debug-log.md của nó để biết con trỏ chi tiết.
EOF

w "$DOCS/overview.md" <<'EOF'
# Overview — __NAME__

## Dự án là gì
## Mục tiêu
## Phạm vi / Non-goals
## Người dùng mục tiêu
EOF

w "$DOCS/decisions.md" <<'EOF'
# Decision Log — __NAME__

## __DATE__ — <quyết định>  [initiative: <loại>-<slug>]
- Bối cảnh:
- Phương án đã cân nhắc:
- Chọn ___ vì:
EOF

echo ""
echo "Xong. Workspace cho '$NAME' tại: $PROJECT_ROOT/.agents/"
echo "  .agents/docs/   (overview, decisions — dùng chung toàn dự án)"
echo "  .agents/plans/  (INDEX initiatives — cổng vào toàn cục)"
echo "→ Initiative plans/<loại>-<slug>/ tạo khi có việc mới (feat-/refactor-/debug-)."
echo "→ architecture.md / conventions.md / domain.md: tạo khi có nội dung thật."
