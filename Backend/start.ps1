$pythonPath = Join-Path $PSScriptRoot "..\Real-ESRGAN\.venv\Scripts\python.exe"
$requirementsPath = Join-Path $PSScriptRoot "requirements.txt"
$frontendPath = Join-Path $PSScriptRoot "..\Frontend"
$frontendPackagePath = Join-Path $frontendPath "package.json"
$frontendDistPath = Join-Path $frontendPath "dist"
$frontendNodeModulesPath = Join-Path $frontendPath "node_modules"

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

if (Test-Path $frontendPackagePath) {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "npm is required to build the React frontend."
    }

    if (-not (Test-Path $frontendNodeModulesPath)) {
        Write-Host "Installing frontend dependencies..."
        Push-Location $frontendPath
        try {
            npm install
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to install frontend dependencies."
            }
        }
        finally {
            Pop-Location
        }
    }

    Write-Host "Building React frontend..."
    Push-Location $frontendPath
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to build frontend."
        }
    }
    finally {
        Pop-Location
    }
}

& $pythonPath -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload --app-dir $PSScriptRoot
