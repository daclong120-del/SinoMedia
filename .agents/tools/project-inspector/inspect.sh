#!/usr/bin/env bash
# inspect.sh
# Công cụ khảo sát cấu trúc dự án (generic) cho AI Agent / lập trình viên.
# Vẽ cây thư mục, bỏ qua thư mục nhiễu, thống kê file theo đuôi.
# Tương thích bash 3.2+ (macOS), không dùng mảng kết hợp.

set -o pipefail

# ----- Phân tích tham số -----
TARGET="."
DEPTH=4
MAX_ENTRIES=300
ALL=0
EXTRA_IGNORE=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --depth)       DEPTH="$2"; shift 2 ;;
        --max-entries) MAX_ENTRIES="$2"; shift 2 ;;
        --all)         ALL=1; shift ;;
        --ignore)
            shift
            while [[ $# -gt 0 && "$1" != --* ]]; do EXTRA_IGNORE+=("$1"); shift; done
            ;;
        -h|--help)
            echo "Cách dùng: inspect.sh [đường_dẫn] [--depth N] [--max-entries N] [--all] [--ignore A B ...]"
            exit 0 ;;
        -*) echo "Tham số lạ: $1" >&2; exit 1 ;;
        *)  TARGET="$1"; shift ;;
    esac
done

# ----- Danh sách thư mục bỏ qua -----
IGNORE=( .git node_modules dist build out .next .nuxt __pycache__ .venv venv \
         env .cache coverage .idea .vscode .pytest_cache .mypy_cache target \
         .turbo .parcel-cache vendor .svelte-kit bin obj )
[[ $ALL -eq 1 ]] && IGNORE=()
if [[ ${#EXTRA_IGNORE[@]} -gt 0 ]]; then IGNORE+=("${EXTRA_IGNORE[@]}"); fi

bi_bo_qua() {
    local name="$1"
    [[ $ALL -eq 1 ]] && return 1
    local ig
    for ig in "${IGNORE[@]}"; do
        [[ "$name" == "$ig" ]] && return 0
    done
    return 1
}

# ----- Vẽ cây đệ quy -----
ve_cay() {
    local dir="$1" prefix="$2" cur_depth="$3"
    local dirs=() files=() entry base
    while IFS= read -r entry; do
        [[ -z "$entry" ]] && continue
        base="${entry##*/}"
        if [[ -d "$entry" ]]; then
            bi_bo_qua "$base" && continue
            dirs+=("$entry")
        else
            files+=("$entry")
        fi
    done < <(find "$dir" -mindepth 1 -maxdepth 1 2>/dev/null | LC_ALL=C sort)

    local entries=()
    [[ ${#dirs[@]} -gt 0 ]] && entries+=("${dirs[@]}")
    [[ ${#files[@]} -gt 0 ]] && entries+=("${files[@]}")

    local total=${#entries[@]}
    local bi_cat=0
    if [[ $MAX_ENTRIES -gt 0 && $total -gt $MAX_ENTRIES ]]; then
        bi_cat=$((total - MAX_ENTRIES))
        entries=("${entries[@]:0:$MAX_ENTRIES}")
        total=$MAX_ENTRIES
    fi

    local i=0 la_cuoi nhanh prefix_con
    for entry in "${entries[@]}"; do
        base="${entry##*/}"
        la_cuoi=0
        [[ $((i + 1)) -eq $total && $bi_cat -eq 0 ]] && la_cuoi=1
        if [[ $la_cuoi -eq 1 ]]; then nhanh="└── "; else nhanh="├── "; fi
        if [[ -d "$entry" ]]; then
            printf '%s%s%s/\n' "$prefix" "$nhanh" "$base"
            if [[ $cur_depth -lt $DEPTH ]]; then
                if [[ $la_cuoi -eq 1 ]]; then prefix_con="$prefix    "; else prefix_con="$prefix│   "; fi
                ve_cay "$entry" "$prefix_con" $((cur_depth + 1))
            fi
        else
            printf '%s%s%s\n' "$prefix" "$nhanh" "$base"
        fi
        i=$((i + 1))
    done
    [[ $bi_cat -gt 0 ]] && printf '%s└── ... (còn %d mục bị ẩn — tăng --max-entries để xem)\n' "$prefix" "$bi_cat"
    return 0
}

# ----- Kiểm tra đầu vào -----
if [[ ! -d "$TARGET" ]]; then
    echo "Không phải thư mục: $TARGET" >&2
    exit 1
fi
ROOT="$(cd "$TARGET" && pwd)"

echo "=== KHẢO SÁT DỰ ÁN: $ROOT ==="
[[ $ALL -eq 0 ]] && echo "    (đã bỏ qua: ${IGNORE[*]})"

echo
echo "=== CÂY THƯ MỤC ==="
echo "${ROOT##*/}/"
ve_cay "$ROOT" "" 1

# ----- Thống kê toàn bộ (find + prune, portable) -----
if [[ $ALL -eq 1 || ${#IGNORE[@]} -eq 0 ]]; then
    FILES_FOUND="$(find "$ROOT" -type f 2>/dev/null || true)"
    DIRS_FOUND="$(find "$ROOT" -mindepth 1 -type d 2>/dev/null || true)"
else
    PRUNE=()
    first=1
    for ig in "${IGNORE[@]}"; do
        if [[ $first -eq 1 ]]; then PRUNE+=( -name "$ig" ); first=0
        else PRUNE+=( -o -name "$ig" ); fi
    done
    FILES_FOUND="$(find "$ROOT" \( -type d \( "${PRUNE[@]}" \) -prune \) -o -type f -print 2>/dev/null || true)"
    DIRS_FOUND="$(find "$ROOT" -mindepth 1 \( -type d \( "${PRUNE[@]}" \) -prune \) -o -type d -print 2>/dev/null || true)"
fi

TONG_FILE=$(printf '%s\n' "$FILES_FOUND" | grep -c . || true)
TONG_DIR=$(printf '%s\n' "$DIRS_FOUND"  | grep -c . || true)

echo
echo "=== TỔNG KẾT ==="
echo "Tổng: $TONG_DIR thư mục, $TONG_FILE file"

if [[ "$TONG_FILE" -gt 0 ]]; then
    TOP="$(printf '%s\n' "$FILES_FOUND" | while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        base="${f##*/}"
        tmp="$base"; [[ "$tmp" == .* ]] && tmp="${tmp#.}"
        if [[ "$tmp" == *.* ]]; then
            printf '.%s\n' "$(printf '%s' "${tmp##*.}" | tr 'A-Z' 'a-z')"
        else
            echo "(không đuôi)"
        fi
    done | sort | uniq -c | sort -rn | head -12 | awk '{printf "%s:%s, ", $2, $1}')"
    echo "Đuôi file phổ biến: ${TOP%, }"
fi
