@echo off
setlocal EnableExtensions

cd /d "%~dp0"

set "OUTPUT=diagnostico-muac.txt"

echo =============================================== > "%OUTPUT%"
echo DIAGNOSTICO COMPLETO - MUAC >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo. >> "%OUTPUT%"

echo PROJETO: %CD% >> "%OUTPUT%"
echo DATA: %date% %time% >> "%OUTPUT%"
echo. >> "%OUTPUT%"

echo =============================================== >> "%OUTPUT%"
echo 1. ESTRUTURA DO PROJETO >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo. >> "%OUTPUT%"

tree /F /A | findstr /V /I "node_modules .next .open-next" >> "%OUTPUT%" 2>&1

echo. >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo 2. REFERENCIAS A NOTION >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo. >> "%OUTPUT%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$files = Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\(node_modules|\.next|\.open-next)\\' }; foreach ($f in $files) { try { $matches = Select-String -Path $f.FullName -Pattern '(?i)notion|notionhq|@notionhq|database_id|databaseId' -SimpleMatch:$false -ErrorAction SilentlyContinue; foreach ($m in $matches) { Write-Output ('{0}:{1}: {2}' -f $m.Path,$m.LineNumber,$m.Line.Trim()) } } catch {} }" >> "%OUTPUT%"

echo. >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo 3. REFERENCIAS A PROCESS.ENV >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo. >> "%OUTPUT%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$files = Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\(node_modules|\.next|\.open-next)\\' }; foreach ($f in $files) { try { $matches = Select-String -Path $f.FullName -Pattern 'process\.env|process\[.env.|import\.meta\.env' -ErrorAction SilentlyContinue; foreach ($m in $matches) { $line=$m.Line.Trim(); $line=$line -replace '(?i)(token|secret|password|api[_-]?key)\s*=\s*[^,;\s]+','$1=[REMOVIDO]'; Write-Output ('{0}:{1}: {2}' -f $m.Path,$m.LineNumber,$line) } } catch {} }" >> "%OUTPUT%"

echo. >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo 4. ARQUIVOS DE CONFIGURACAO >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo. >> "%OUTPUT%"

for %%F in (
    "package.json"
    "next.config.ts"
    "next.config.js"
    "wrangler.jsonc"
    "wrangler.toml"
    "open-next.config.ts"
    "open-next.config.js"
    ".env.local.example"
    ".gitignore"
    ".dev.vars"
) do (
    if exist "%%~F" (
        echo. >> "%OUTPUT%"
        echo ---------- %%~F ---------- >> "%OUTPUT%"
        type "%%~F" >> "%OUTPUT%"
    )
)

echo. >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo 5. ARQUIVOS JAVASCRIPT/TYPESCRIPT >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo. >> "%OUTPUT%"

powershell -NoProfile -Command ^
"Get-ChildItem -Path . -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\(node_modules|\.next|\.open-next)\\' } | Select-Object -ExpandProperty FullName" >> "%OUTPUT%"

echo. >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo 6. DEPENDENCIAS RELACIONADAS AO NOTION >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo. >> "%OUTPUT%"

findstr /I "notion" package.json package-lock.json >> "%OUTPUT%" 2>&1

echo. >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo 7. GIT - ARQUIVOS ENV >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo. >> "%OUTPUT%"

git ls-files | findstr /I ".env .dev.vars" >> "%OUTPUT%" 2>&1

echo. >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"
echo FIM >> "%OUTPUT%"
echo =============================================== >> "%OUTPUT%"

echo.
echo Diagnostico concluido.
echo.
echo Arquivo gerado:
echo %CD%\%OUTPUT%
echo.
pause