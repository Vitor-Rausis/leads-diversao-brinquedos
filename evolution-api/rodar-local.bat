@echo off
echo ========================================
echo  Evolution API - Rodando Localmente
echo  Apenas para escanear o QR Code
echo ========================================
echo.

cd /d "%~dp0"

IF NOT EXIST "evolution-local" (
    echo Baixando Evolution API...
    git clone --depth=1 https://github.com/EvolutionAPI/evolution-api.git evolution-local
    cd evolution-local
    echo Instalando dependencias...
    npm install --omit=dev
) ELSE (
    cd evolution-local
)

echo.
echo Configurando variaveis de ambiente...

set SERVER_TYPE=http
set SERVER_PORT=8080
set SERVER_URL=http://localhost:8080
set CORS_ORIGIN=*
set LOG_LEVEL=ERROR
set LOG_BAILEYS=debug
set DEL_INSTANCE=false

set AUTHENTICATION_TYPE=apikey
set AUTHENTICATION_API_KEY=primora-evo-api-2024-secret
set AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

set DATABASE_ENABLED=true
set DATABASE_PROVIDER=postgresql
set DATABASE_CONNECTION_URI=postgresql://postgres:Vitor140398#@db.pxmexqrbdbiosluofppl.supabase.co:5432/postgres?schema=evolution
set DATABASE_CONNECTION_CLIENT_NAME=evolution_api
set DATABASE_SAVE_DATA_INSTANCE=true
set DATABASE_SAVE_DATA_NEW_MESSAGE=true
set DATABASE_SAVE_MESSAGE_UPDATE=true
set DATABASE_SAVE_DATA_CONTACTS=true
set DATABASE_SAVE_DATA_CHATS=true

set CONFIG_SESSION_PHONE_VERSION=2.3000.0

set CACHE_REDIS_ENABLED=false
set CACHE_LOCAL_ENABLED=true

echo.
echo Iniciando servidor na porta 8080...
echo.
echo Quando aparecer "Evolution API", acesse:
echo   http://localhost:8080/manager
echo.
echo Crie a instancia e escaneie o QR Code.
echo Depois feche esta janela.
echo.

npm run start:prod

pause
