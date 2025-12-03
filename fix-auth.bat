@echo off
echo Redefinindo credenciais...
git config --global --unset credential.helper
git config --global credential.helper manager
echo.
echo Tentando push...
git push origin main
pause
