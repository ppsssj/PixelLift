$pythonPath = Join-Path $PSScriptRoot "..\Real-ESRGAN\.venv\Scripts\python.exe"
$requirementsPath = Join-Path $PSScriptRoot "requirements.txt"

if (-not (Test-Path $pythonPath)) {
    throw "Python virtual environment not found at $pythonPath"
}

& $pythonPath -c "import fastapi, uvicorn, multipart" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing backend dependencies into the Real-ESRGAN virtual environment..."
    & $pythonPath -m pip install -r $requirementsPath
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install backend dependencies."
    }
}

& $pythonPath -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload --app-dir $PSScriptRoot
