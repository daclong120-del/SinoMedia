<#
.SYNOPSIS
    Tap lenh tach nen anh su dung PhotoRoom API voi co che xoay tua API Key.
.DESCRIPTION
    Tap lenh nay nhan duong dan anh dau vao, thuc hien goi PhotoRoom API de tach nen
    va luu ket qua. Tap lenh ho tro nap nhieu API key de xoay tua khi gap loi.
.PARAMETER InputPath
    Duong dan den tap tin anh nguon can xu ly (dinh dang JPG, JPEG, PNG, WEBP).
.PARAMETER OutputPath
    Duong dan luu ket qua anh da tach nen. Neu khong truyen, mac dinh luu cung thu muc voi anh goc.
.PARAMETER ApiKey
    API Key dung truc tiep (do uu tien cao nhat).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "Duong dan toi tep anh dau vao")]
    [string]$InputPath,

    [Parameter(Mandatory = $false, HelpMessage = "Duong dan luu anh dau ra")]
    [string]$OutputPath,

    [Parameter(Mandatory = $false, HelpMessage = "API Key cua PhotoRoom")]
    [string]$ApiKey
)

# Dam bao dau ra su dung UTF-8 de hien thi tieng Viet co dau chuan xac
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Nap assembly System.Net.Http de goi API
try {
    Add-Type -AssemblyName System.Net.Http -ErrorAction Stop
} catch {
    Write-Error "LOI: Khong the nap thu vien System.Net.Http. Vui long dam bao moi truong ho tro .NET Framework 4.5+."
    exit 1
}

# 1. Xac dinh duong dan file cau hinh cuc bo
$ConfigPath = Join-Path $PSScriptRoot "config.json"

# 2. Thu thuap danh sach API Keys theo do uu tien
$Keys = [System.Collections.Generic.List[string]]::new()

# Muc uu tien 1: Tham so -ApiKey truyen vao
if (-not [string]::IsNullOrWhiteSpace($ApiKey)) {
    $Keys.Add($ApiKey.Trim())
}

# Muc uu tien 2: Bien moi truong PHOTOROOM_API_KEY
if (-not [string]::IsNullOrWhiteSpace($env:PHOTOROOM_API_KEY)) {
    $Keys.Add($env:PHOTOROOM_API_KEY.Trim())
}

# Muc uu tien 3: File config.json cuc bo
$Config = $null
if (Test-Path $ConfigPath) {
    try {
        $ConfigContent = Get-Content $ConfigPath -Raw -ErrorAction Stop
        if (-not [string]::IsNullOrWhiteSpace($ConfigContent)) {
            $Config = ConvertFrom-Json $ConfigContent -ErrorAction Stop
            if ($Config -and $Config.api_keys) {
                foreach ($key in $Config.api_keys) {
                    if (-not [string]::IsNullOrWhiteSpace($key)) {
                        $Keys.Add($key.Trim())
                    }
                }
            }
        }
    } catch {
        Write-Warning "Khong the doc tep cau hinh config.json: $_"
    }
}

# Loc cac key trung lap de giu danh sach duy nhat theo dung do uu tien
$UniqueKeys = @()
foreach ($key in $Keys) {
    if ($key -notin $UniqueKeys) {
        $UniqueKeys += $key
    }
}

# 3. Kiem tra tinh hop le cua danh sach API Keys
if ($UniqueKeys.Count -eq 0) {
    Write-Error "LOI: Khong tim thay bat ky API Key nao! Vui long cau hinh API Key qua mot trong cac cach sau:`n1. Tham so -ApiKey khi chay script.`n2. Thiet lap bien moi truong `$env:PHOTOROOM_API_KEY`.`n3. Cau hinh mang 'api_keys' trong file config.json."
    exit 1
}

# 4. Kiem tra su ton tai cua anh dau vao
if (-not (Test-Path $InputPath)) {
    Write-Error "LOI: Tap tin anh dau vao khong ton tai tai duong dan: $InputPath"
    exit 1
}

# Lay duong dan tuyet doi cua anh dau vao
$AbsoluteInputPath = (Resolve-Path $InputPath).Path

# Kiem tra dinh dang anh dau vao
$Extension = [System.IO.Path]::GetExtension($AbsoluteInputPath).ToLower()
if ($Extension -notin @(".jpg", ".jpeg", ".png", ".webp")) {
    Write-Error "LOI: Dinh dang tep '$Extension' khong duoc ho tro. Chi ho tro cac dinh dang: .jpg, .jpeg, .png, .webp"
    exit 1
}

# 5. Xac dinh duong dan tep anh ket qua va don dep thu muc tam
$TempOutputDir = Join-Path $PSScriptRoot "temp_outputs"

# Doc cau hinh don dep thu muc tam
$CleanupExpiryMinutes = 30
if ($null -ne $Config -and $null -ne $Config.cleanup_expiry_minutes) {
    try {
        $CleanupExpiryMinutes = [int]$Config.cleanup_expiry_minutes
    } catch {
        Write-Warning "Gia tri don dep 'cleanup_expiry_minutes' trong config.json khong hop la, dung mac dinh 30 phut."
    }
}

# Thuc hien don dep tu dong thu muc tam neu ton tai truoc khi xu ly
if (Test-Path $TempOutputDir) {
    try {
        $ExpiryTime = (Get-Date).AddMinutes(-$CleanupExpiryMinutes)
        $OldFiles = Get-ChildItem -Path $TempOutputDir -File -Filter "*_nobg.png" | Where-Object { $_.LastWriteTime -lt $ExpiryTime }
        if ($OldFiles.Count -gt 0) {
            Write-Host "[-] Dang don dep $($OldFiles.Count) tep tam cu hon $CleanupExpiryMinutes phut..." -ForegroundColor Gray
            $OldFiles | Remove-Item -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Warning "Khong the don dep cac tep tam: $_"
    }
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    # Tao thu muc temp_outputs neu chua co
    if (-not (Test-Path $TempOutputDir)) {
        $null = New-Item -ItemType Directory -Force -Path $TempOutputDir
    }
    $FileNameWithoutExt = [System.IO.Path]::GetFileNameWithoutExtension($AbsoluteInputPath)
    $AbsoluteOutputPath = Join-Path $TempOutputDir ($FileNameWithoutExt + "_nobg.png")
} else {
    $AbsoluteOutputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
}

Write-Host "--------------------------------------------------" -ForegroundColor Gray
Write-Host " Khoi dong Cong cu Tach Nen remove-bg" -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Gray
Write-Host "[-] Anh dau vao  : $AbsoluteInputPath"
Write-Host "[-] Anh dau ra   : $AbsoluteOutputPath"
Write-Host "[-] So API Keys  : $($UniqueKeys.Count) key(s) da duoc nap thanh cong."
Write-Host "--------------------------------------------------" -ForegroundColor Gray

# 6. Goi PhotoRoom API va thuc hien Xoay tua API Key
$ApiUrl = "https://sdk.photoroom.com/v1/segment"
$Success = $false

for ($i = 0; $i -lt $UniqueKeys.Count; $i++) {
    $CurrentKey = $UniqueKeys[$i]
    Write-Host "[-] Dang thu API Key so $($i + 1)/$($UniqueKeys.Count)..." -ForegroundColor Cyan
    
    $HttpClient = [System.Net.Http.HttpClient]::new()
    $HttpClient.Timeout = [System.TimeSpan]::FromSeconds(45)
    
    $Content = [System.Net.Http.MultipartFormDataContent]::new()
    $FileStream = $null
    $FileContent = $null
    
    try {
        # Cau hinh header xac thuc
        $HttpClient.DefaultRequestHeaders.Add("x-api-key", $CurrentKey)
        
        # Mo luong doc file anh
        $FileStream = [System.IO.File]::OpenRead($AbsoluteInputPath)
        $FileContent = [System.Net.Http.StreamContent]::new($FileStream)
        
        # Xac dinh Content-Type phu hop
        $ContentType = "image/jpeg"
        if ($Extension -eq ".png") {
            $ContentType = "image/png"
        } elseif ($Extension -eq ".webp") {
            $ContentType = "image/webp"
        }
        $FileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse($ContentType)
        
        # Them file vao form data
        $FileName = [System.IO.Path]::GetFileName($AbsoluteInputPath)
        $Content.Add($FileContent, "image_file", $FileName)
        
        # Gui request
        $ResponseTask = $HttpClient.PostAsync($ApiUrl, $Content)
        $HttpResponse = $ResponseTask.GetAwaiter().GetResult()
        
        $StatusCode = [int]$HttpResponse.StatusCode
        
        if ($HttpResponse.IsSuccessStatusCode) {
            # Doc stream anh ket qua
            $ResponseBodyTask = $HttpResponse.Content.ReadAsStreamAsync()
            $ResponseStream = $ResponseBodyTask.GetAwaiter().GetResult()
            
            # Dam bao thu muc dau ra ton tai
            $OutputDir = [System.IO.Path]::GetDirectoryName($AbsoluteOutputPath)
            if (-not (Test-Path $OutputDir)) {
                $null = New-Item -ItemType Directory -Force -Path $OutputDir
            }
            
            # Ghi ra file anh da tach nen
            $OutStream = [System.IO.File]::Create($AbsoluteOutputPath)
            try {
                $ResponseStream.CopyTo($OutStream)
            } finally {
                $OutStream.Dispose()
                $ResponseStream.Dispose()
            }
            
            Write-Host "[OK] Tach nen thanh cong bang API Key so $($i + 1)." -ForegroundColor Green
            $Success = $true
            break
        } else {
            # Doc loi tu API
            $ErrorTextTask = $HttpResponse.Content.ReadAsStringAsync()
            $ErrorText = $ErrorTextTask.GetAwaiter().GetResult()
            
            Write-Warning "[-] API Key so $($i + 1) that bai. HTTP Status Code: $StatusCode - $ErrorText"
            
            if ($StatusCode -eq 401) {
                Write-Warning "    Loi: API Key khong hop le (Unauthorized)."
            } elseif ($StatusCode -eq 402 -or $StatusCode -eq 429) {
                Write-Warning "    Loi: API Key het han muc dung (Quota) hoac bi gioi han tan suat (Rate Limit)."
            } else {
                Write-Warning "    Loi he thong hoac loi khac tu may chu PhotoRoom."
            }
        }
    } catch [System.Management.Automation.MethodInvocationException] {
        $InnerException = $_.Exception.InnerException
        if ($null -ne $InnerException -and ($InnerException.GetType().FullName -eq "System.Net.Http.HttpRequestException" -or $InnerException.GetType().FullName -eq "System.Net.WebException")) {
            Write-Error "LOI KET NOI MANG: Khong the ket noi toi may chu PhotoRoom API. Vui long kiem tra lai duong truyen internet."
            exit 1
        } else {
            Write-Warning "[-] Loi thuc thi phuong thuc voi API Key so $($i + 1): $_"
        }
    } catch {
        $ErrType = $_.Exception.GetType().FullName
        if ($ErrType -eq "System.Net.Http.HttpRequestException" -or $ErrType -eq "System.Net.WebException") {
            Write-Error "LOI KET NOI MANG: Khong the ket noi toi may chu PhotoRoom API. Vui long kiem tra lai duong truyen internet."
            exit 1
        }
        Write-Warning "[-] Gap loi khong xac dinh voi API Key so $($i + 1): $_"
    } finally {
        if ($null -ne $FileContent) { $FileContent.Dispose() }
        if ($null -ne $FileStream) { $FileStream.Dispose() }
        if ($null -ne $Content) { $Content.Dispose() }
        if ($null -ne $HttpClient) { $HttpClient.Dispose() }
    }
}

if (-not $Success) {
    Write-Error "LOI: Tat ca cac API Key trong danh sach deu da thu nghiem nhung deu that bai."
    exit 1
}

# Output duong dan file anh ket qua o dong cuoi cung
Write-Output $AbsoluteOutputPath
