Write-Host "Demarrage du serveur FastAPI..." -ForegroundColor Green
Set-Location $PSScriptRoot
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000



