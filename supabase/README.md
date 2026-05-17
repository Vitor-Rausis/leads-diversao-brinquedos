# Edge Functions - Cron de Mensagens

Substitui o cron interno do backend (que nao roda no Render free tier por causa do hibernate).

## Arquitetura

```
Supabase Postgres
  -> pg_cron (a cada 1min)
    -> pg_net.http_post
      -> Edge Function (Deno)
        -> Evolution API + Supabase DB
```

Nada disso depende do Render estar acordado.

## Functions

| Function | O que faz | Equivalente no backend |
|---|---|---|
| `process-scheduled` | Envia mensagens da tabela `mensagens_agendadas` | `backend/src/jobs/whatsappJobs.js` |
| `poll-messages` | Busca respostas recebidas via Evolution API | `backend/src/jobs/incomingMessagesJob.js` |
| `process-drip` | Processa fila `drip_queue` | `backend/src/services/dripService.js` |

## Deploy

### 1. Instalar Supabase CLI
```bash
npm install -g supabase
supabase login
```

### 2. Linkar o projeto
```bash
supabase link --project-ref SEU_PROJECT_REF
```
O `project_ref` esta na URL: `https://SEU_PROJECT_REF.supabase.co`

### 3. Configurar secrets (variaveis de ambiente das functions)
```bash
supabase secrets set EVOLUTION_API_URL=https://sua-evolution-api.com
supabase secrets set EVOLUTION_API_KEY=sua-chave
supabase secrets set EVOLUTION_API_INSTANCE=diversao-brinquedos
```

Obs: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` ja estao injetadas automaticamente pelo Supabase em toda Edge Function — nao precisa setar.

### 4. Deploy das 3 functions
```bash
supabase functions deploy process-scheduled
supabase functions deploy poll-messages
supabase functions deploy process-drip
```

### 5. Habilitar pg_cron + pg_net e agendar jobs

Abra o SQL Editor do Supabase e execute `docs/pg-cron-migration.sql`.

**Antes de executar**, edite no arquivo:
- `PROJECT_REF` (3 ocorrencias) — seu project ref
- `SERVICE_ROLE_KEY` (3 ocorrencias) — Settings -> API -> service_role key

### 6. Desligar cron interno do backend

Como agora o pg_cron faz tudo, o `node-cron` do backend so duplicaria trabalho.
Edite `backend/src/server.js` e remova/comente a chamada `initScheduler()`.

Tambem pode desabilitar o workflow do GitHub Actions:
```bash
rm .github/workflows/cron.yml
```

## Monitoramento

```sql
-- Ver jobs ativos
SELECT jobid, jobname, schedule, active FROM cron.job;

-- Ver ultimas execucoes (status, return_message, etc.)
SELECT
  start_time,
  job_pid,
  database,
  username,
  command,
  status,
  return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- Logs das Edge Functions: Supabase Dashboard -> Edge Functions -> [nome] -> Logs
```

## Custos

- Edge Functions: 500K invocations/mes gratis no plano Free.
  - 3 functions x 1min x 1440 min/dia x 30 dias = ~130K invocations/mes. Dentro do free.
- pg_cron: gratis, parte do Postgres.
- pg_net: gratis, extensao do Supabase.

## Troubleshooting

**Job nao executa:**
```sql
SELECT * FROM cron.job_run_details WHERE jobname = 'process_scheduled_messages' ORDER BY start_time DESC LIMIT 5;
```
Se `status = 'failed'`, leia `return_message`.

**Function retorna 401 Unauthorized:**
O `SERVICE_ROLE_KEY` no SQL esta errado ou expirado. Pegue de novo em Settings -> API.

**Mensagem nao chega no WhatsApp mas log diz "enviada":**
Verifique se `EVOLUTION_API_URL` esta acessivel publicamente (Edge Functions rodam fora da sua infra).
