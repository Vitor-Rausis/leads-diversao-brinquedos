@echo off
cd /d "C:\Users\Desenvolvedor\Desktop\Leads_Diversao_Brinquedos\backend"

REM Inicia o backend via PM2
call "C:\Users\Desenvolvedor\AppData\Roaming\npm\pm2.cmd" resurrect

REM Aguarda o servidor iniciar
timeout /t 5 /nobreak > nul

REM Reconfigura o webhook com o IP atual da VPN (OpenVPN Data Channel Offload)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "OpenVPN Data Channel Offload" /A /N ^| findstr /i "IPv4"') do set "MYIP=%%a"
node -e "require('dotenv').config(); const a=require('axios'); const ip='%MYIP%'.trim(); if(!ip)process.exit(0); a.post(process.env.EVOLUTION_API_URL+'/webhook/set/'+(process.env.EVOLUTION_INSTANCE||'diversao-brinquedos'),{webhook:{enabled:true,url:'http://'+ip+':3001/api/v1/webhook/whatsapp',webhookByEvents:false,webhookBase64:false,events:['MESSAGES_UPSERT']}},{headers:{apikey:process.env.EVOLUTION_API_KEY}}).then(r=>console.log('Webhook atualizado:',ip)).catch(e=>console.log('Erro webhook:',e.message));"
