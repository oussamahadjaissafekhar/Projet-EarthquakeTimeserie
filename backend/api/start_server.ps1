Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Démarrage de l'API FastAPI Backend     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Activation de l'environnement virtuel s'il existe (dans le dossier backend)
if (Test-Path "..\.venv\Scripts\Activate.ps1") {
    Write-Host "[*] Activation du venv backend..." -ForegroundColor Yellow
    & "..\.venv\Scripts\Activate.ps1"
} elseif (Test-Path "$env:USERPROFILE\Desktop\UPEC\M2\S1\MD\projet\.venv\Scripts\Activate.ps1") {
    Write-Host "[*] Activation du venv projet..." -ForegroundColor Yellow
    & "$env:USERPROFILE\Desktop\UPEC\M2\S1\MD\projet\.venv\Scripts\Activate.ps1"
}

# Installation des dépendances si uvicorn est absent
try {
    python -c "import uvicorn" 2>$null
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Host "[!] Installation des dépendances manquantes..." -ForegroundColor Magenta
    pip install fastapi uvicorn duckdb pandas numpy scipy scikit-learn
}

Write-Host "[*] Lancement de Uvicorn sur http://0.0.0.0:8000 ..." -ForegroundColor Green
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
