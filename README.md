# Leads Diversao Brinquedos

Sistema de gestao de leads e automacao de mensagens via WhatsApp.

## Stack

- **Backend:** Node.js + Express
- **Frontend:** React + Vite + Tailwind CSS v4
- **Banco de dados:** PostgreSQL (Supabase)
- **Agendamentos:** node-cron
- **WhatsApp:** Evolution API

## Configuracao

### 1. Banco de Dados

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o SQL do arquivo `docs/database-schema.sql` no SQL Editor do Supabase
3. Copie a URL e a Service Role Key do projeto

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edite o .env com suas credenciais do Supabase e Evolution API
npm install
npm run seed   # Cria usuario admin e templates de mensagem
npm run dev    # Inicia em http://localhost:3001
```

**Login padrao:** `admin@diversaobrinquedos.com` / `admin123`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev    # Inicia em http://localhost:5173
```

## API

### Rotas Autenticadas (Bearer Token)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | /api/v1/auth/login | Login |
| GET | /api/v1/auth/me | Usuario logado |
| GET | /api/v1/leads | Listar leads |
| POST | /api/v1/leads | Criar lead |
| GET | /api/v1/leads/:id | Detalhe do lead |
| PUT | /api/v1/leads/:id | Atualizar lead |
| DELETE | /api/v1/leads/:id | Excluir lead |
| POST | /api/v1/leads/import | Importar CSV/Excel |
| GET | /api/v1/messages | Log de mensagens |
| GET | /api/v1/messages/scheduled | Mensagens agendadas |
| GET | /api/v1/dashboard/stats | KPIs |
| GET | /api/v1/dashboard/funnel | Funil de leads |
| GET | /api/v1/dashboard/progress | Progresso temporal |
| GET | /api/v1/dashboard/origins | Leads por origem |
| GET | /api/v1/reports | Listar relatorios |
| POST | /api/v1/reports/generate | Gerar relatorio |
| GET | /api/v1/reports/:id/csv | Download CSV |
| GET | /api/v1/settings/api-keys | Listar API keys |
| POST | /api/v1/settings/api-keys | Criar API key |

### Endpoint Publico (API Key)

```
POST /api/v1/public/leads
Header: x-api-key: sua_chave
Body: { "nome": "...", "whatsapp": "5511999999999", "origem": "Formulario do site" }
```

### Webhook WhatsApp

```
POST /api/v1/webhook/whatsapp
```

## Automacao

O sistema envia mensagens automaticas via WhatsApp:

- **3 dias** apos cadastro: pergunta sobre interesse
- **7 dias** apos cadastro: pergunta sobre locacao
- **10 meses** apos cadastro: oferece catalogo atualizado

Se o lead responder, as automacoes sao pausadas automaticamente.

## Deploy

### Backend (Railway/Render)

- Build: `npm install`
- Start: `node src/server.js`
- Variaveis: configurar conforme `.env.example`

### Frontend (Vercel)

- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Variavel: `VITE_API_URL=https://seu-backend.railway.app/api/v1`
