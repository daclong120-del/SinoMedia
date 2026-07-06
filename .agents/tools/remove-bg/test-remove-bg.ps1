# test-remove-bg.ps1
# Integration test suite for remove-bg tool

$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$ScriptPath = Join-Path $PSScriptRoot "remove-bg.ps1"
$InputImage = Join-Path $PSScriptRoot "test.png"
$TempOutputDir = Join-Path $PSScriptRoot "temp_outputs"

Write-Host "==============================================" -ForegroundColor Gray
Write-Host " RUNNING INTEGRATION TESTS FOR REMOVE-BG" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Gray

# Test 1: Check input image existence
Write-Host "[Test 1/4] Checking test image existence..."
if (-not (Test-Path $InputImage)) {
    Write-Error "Test image 'test.png' not found at $InputImage. Please place a test image there first."
    exit 1
}
Write-Host "[PASS] Test image found." -ForegroundColor Green

# Test 2: Standard execution and OutputPath verification
Write-Host "[Test 2/4] Testing standard background removal..."
$Output = powershell -ExecutionPolicy Bypass -File $ScriptPath -InputPath $InputImage 2>&1
$LastLine = $Output[-1]

Write-Host "[-] Script stdout last line: $LastLine"
if (-not (Test-Path $LastLine)) {
    Write-Error "Test failed: Output file specified in last line does not exist: $LastLine"
    exit 1
}

$FileSize = (Get-Item $LastLine).Length
if ($FileSize -le 0) {
    Write-Error "Test failed: Generated output file is empty."
    exit 1
}
Write-Host "[PASS] Output file successfully created and verified ($FileSize bytes)." -ForegroundColor Green

# Test 3: Auto-cleanup verification
Write-Host "[Test 3/4] Testing auto-cleanup mechanism..."
if (-not (Test-Path $TempOutputDir)) {
    $null = New-Item -ItemType Directory -Path $TempOutputDir -Force
}
$DummyOldFile = Join-Path $TempOutputDir "old_cleanup_test_nobg.png"
New-Item -ItemType File -Path $DummyOldFile -Force | Out-Null
(Get-Item $DummyOldFile).LastWriteTime = (Get-Date).AddMinutes(-45)

Write-Host "[-] Created old file: $DummyOldFile (modified 45 mins ago)"
# Run the script again to trigger cleanup
$null = powershell -ExecutionPolicy Bypass -File $ScriptPath -InputPath $InputImage 2>&1

if (Test-Path $DummyOldFile) {
    Write-Error "Test failed: Old file was not cleaned up."
    exit 1
}
Write-Host "[PASS] Auto-cleanup successfully deleted the expired file." -ForegroundColor Green

# Test 4: Key failure handling (invalid key should exit with code 1)
Write-Host "[Test 4/4] Testing error propagation with invalid API Key..."
$ConfigFilePath = Join-Path $PSScriptRoot "config.json"
$ConfigExists = Test-Path $ConfigFilePath
if ($ConfigExists) {
    Rename-Item -Path $ConfigFilePath -NewName "config.json.tmp" -Force
}
try {
    $ErrorRun = powershell -ExecutionPolicy Bypass -File $ScriptPath -InputPath $InputImage -ApiKey "invalid_api_key_test" 2>&1
    $LastExitCode = $LASTEXITCODE
} finally {
    if ($ConfigExists) {
        Rename-Item -Path (Join-Path $PSScriptRoot "config.json.tmp") -NewName "config.json" -Force
    }
}

if ($LastExitCode -ne 0) {
    Write-Host "[PASS] Script correctly returned non-zero exit code ($LastExitCode) for invalid key." -ForegroundColor Green
} else {
    Write-Error "Test failed: Script returned exit code 0 even when all keys failed."
    exit 1
}

Write-Host "==============================================" -ForegroundColor Gray
Write-Host " ALL INTEGRATION TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Gray
exit 0
