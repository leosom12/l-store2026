@echo off
chcp 65001 >nul
echo ===================================================
echo   ATUALIZAÇÃO SEGURA DO SISTEMA L-PDV
echo ===================================================
echo.
echo Este script irá atualizar o código do sistema.
echo SEUS DADOS (Produtos, Vendas, Relatórios) ESTÃO SEGUROS.
echo Eles não serão apagados pois estão salvos no banco de dados.
echo.
pause

echo.
echo 1. Verificando conexão com a internet...
ping google.com -n 1 >nul
if %errorlevel% neq 0 (
    echo ❌ Sem conexão com a internet. Verifique sua rede.
    pause
    exit /b
)

echo.
echo 2. Baixando atualizações...
git pull origin main

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Houve um erro ao baixar as atualizações.
    echo Se você alterou arquivos do código, pode haver conflitos.
    echo Seus dados de banco de dados continuam seguros.
    pause
    exit /b
)

echo.
echo 3. Atualizando dependências...
call npm install

echo.
echo ===================================================
echo   ✅ ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!
echo ===================================================
echo.
echo Agora você pode fechar esta janela e iniciar o servidor novamente.
echo.
pause
