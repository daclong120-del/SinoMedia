# inspect.ps1
# Công cụ khảo sát cấu trúc dự án (generic) cho AI Agent / lập trình viên.
# Vẽ cây thư mục, bỏ qua thư mục nhiễu, thống kê file theo đuôi.

[CmdletBinding()]
param(
    [string]$Path = ".",
    [int]$Depth = 4,
    [int]$MaxEntries = 300,
    [switch]$All,
    [string[]]$Ignore = @()
)

# Các thư mục "nhiễu" bỏ qua mặc định — không phải code do mình viết
$BoQua = @(
    ".git", "node_modules", "dist", "build", "out", ".next", ".nuxt",
    "__pycache__", ".venv", "venv", "env", ".cache", "coverage",
    ".idea", ".vscode", ".pytest_cache", ".mypy_cache", "target",
    ".turbo", ".parcel-cache", "vendor", ".svelte-kit", "bin", "obj"
)
if ($All) { $BoQua = @() }
$BoQua += $Ignore

# Lấy thư mục con + file (đã lọc, sắp xếp: thư mục trước rồi file)
function Get-Entries {
    param([string]$Dir)
    try {
        $items = Get-ChildItem -LiteralPath $Dir -Force -ErrorAction Stop
    } catch {
        return @()
    }
    $dirs = @($items | Where-Object { $_.PSIsContainer -and ($BoQua -notcontains $_.Name) } | Sort-Object Name)
    $files = @($items | Where-Object { -not $_.PSIsContainer } | Sort-Object Name)
    return @($dirs + $files)
}

# Vẽ cây đệ quy theo kiểu ├── └──
function Show-Cay {
    param([string]$Dir, [string]$Prefix, [int]$CurDepth)

    $entries = Get-Entries -Dir $Dir
    $biCat = 0
    if ($MaxEntries -gt 0 -and $entries.Count -gt $MaxEntries) {
        $biCat = $entries.Count - $MaxEntries
        $entries = $entries[0..($MaxEntries - 1)]
    }

    for ($i = 0; $i -lt $entries.Count; $i++) {
        $e = $entries[$i]
        $laCuoi = ($i -eq ($entries.Count - 1)) -and ($biCat -eq 0)
        $nhanh = if ($laCuoi) { "└── " } else { "├── " }
        if ($e.PSIsContainer) {
            Write-Host ($Prefix + $nhanh + $e.Name + "/")
            if ($CurDepth -lt $Depth) {
                $prefixCon = $Prefix + $(if ($laCuoi) { "    " } else { "│   " })
                Show-Cay -Dir $e.FullName -Prefix $prefixCon -CurDepth ($CurDepth + 1)
            }
        } else {
            Write-Host ($Prefix + $nhanh + $e.Name)
        }
    }
    if ($biCat -gt 0) {
        Write-Host ($Prefix + "└── ... (còn $biCat mục bị ẩn — tăng -MaxEntries để xem)")
    }
}

# Thống kê toàn bộ (không phụ thuộc -Depth), bỏ qua thư mục nhiễu
$script:TongFile = 0
$script:TongDir = 0
$script:DemDuoi = @{}
function Quet-ThongKe {
    param([string]$Dir)
    try {
        $items = Get-ChildItem -LiteralPath $Dir -Force -ErrorAction Stop
    } catch {
        return
    }
    foreach ($e in $items) {
        if ($e.PSIsContainer) {
            if ($BoQua -notcontains $e.Name) {
                $script:TongDir++
                Quet-ThongKe -Dir $e.FullName
            }
        } else {
            $script:TongFile++
            $ext = if ($e.Extension) { $e.Extension.ToLower() } else { "(không đuôi)" }
            if ($script:DemDuoi.ContainsKey($ext)) { $script:DemDuoi[$ext]++ } else { $script:DemDuoi[$ext] = 1 }
        }
    }
}

# ===== Chạy chính =====
$resolved = Resolve-Path -LiteralPath $Path -ErrorAction SilentlyContinue
if (-not $resolved -or -not (Test-Path -LiteralPath $resolved.Path -PathType Container)) {
    Write-Error "Không phải thư mục: $Path"
    exit 1
}
$Root = $resolved.Path

Write-Host "=== KHẢO SÁT DỰ ÁN: $Root ===" -ForegroundColor Green
if (-not $All) {
    Write-Host ("    (đã bỏ qua: " + ($BoQua -join ", ") + ")") -ForegroundColor DarkGray
}

Write-Host "`n=== CÂY THƯ MỤC ===" -ForegroundColor Cyan
Write-Host ((Split-Path -Leaf $Root) + "/")
Show-Cay -Dir $Root -Prefix "" -CurDepth 1

Quet-ThongKe -Dir $Root
Write-Host "`n=== TỔNG KẾT ===" -ForegroundColor Cyan
Write-Host "Tổng: $($script:TongDir) thư mục, $($script:TongFile) file"
if ($script:DemDuoi.Count -gt 0) {
    $top = $script:DemDuoi.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 12
    $line = ($top | ForEach-Object { "$($_.Key):$($_.Value)" }) -join ", "
    Write-Host "Đuôi file phổ biến: $line"
}
