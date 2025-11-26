@echo off
chcp 65001 >nul
echo.
echo ========================================
echo 🚀 DEPLOY AUTOMÁTICO PARA RENDER
echo ========================================
echo.

REM Verificar se Git está instalado
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git não está instalado!
    echo.
    echo 📥 Instale o Git primeiro:
    echo    https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo ✅ Git detectado
echo.

REM Verificar status do repositório
echo 📊 Verificando status do repositório...
git status

echo.
echo ========================================
echo 📦 PREPARANDO ARQUIVOS PARA DEPLOY
echo ========================================
echo.

REM Adicionar todos os arquivos
echo 📁 Adicionando arquivos...
git add .

echo.
echo 💬 Digite a mensagem do commit (ou pressione Enter para usar padrão):
set /p commit_msg="Mensagem: "

if "%commit_msg%"=="" (
    set commit_msg=Deploy para Render - %date% %time%
)

echo.
echo 💾 Fazendo commit...
git commit -m "%commit_msg%"

if errorlevel 1 (
    echo.
    echo ⚠️ Nenhuma mudança para commitar ou erro no commit
    echo.
)

echo.
echo ========================================
echo 🌐 ENVIANDO PARA GITHUB
echo ========================================
echo.

echo 📤 Fazendo push para GitHub...
git push origin main

if errorlevel 1 (
    echo.
    echo ❌ Erro ao fazer push!
    echo.
    echo 💡 Possíveis soluções:
    echo    1. Verifique sua conexão com a internet
    echo    2. Verifique se o repositório remoto está configurado
    echo    3. Execute: git remote -v
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ DEPLOY CONCLUÍDO COM SUCESSO!
echo ========================================
echo.
echo 🎉 Seu código foi enviado para o GitHub!
echo.
echo 📋 Próximos passos:
echo    1. O Render detectará automaticamente as mudanças
echo    2. O deploy será iniciado em alguns segundos
echo    3. Acompanhe o progresso no dashboard do Render
echo.
echo 🌐 Acesse: https://dashboard.render.com
echo.
pause
