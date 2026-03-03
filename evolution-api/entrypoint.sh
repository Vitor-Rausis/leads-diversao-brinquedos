#!/bin/sh
# Gera o .env a partir das variáveis de ambiente (necessário para Evolution API v2.3.7)
printenv | grep -v "^PATH=" | grep -v "^HOME=" | grep -v "^HOSTNAME=" | grep -v "^TERM=" | grep -v "^PWD=" | grep -v "^SHLVL=" | grep -v "^_=" > /evolution/.env

# Executa as migrações e inicia o servidor
. ./Docker/scripts/deploy_database.sh && npm run start:prod
