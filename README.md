# FY Business & Immigration Solutions — Landing

Static landing page (HTML + CSS + vanilla JS, no build step) for FY Business & Immigration Solutions, Atlanta, GA.

## Structure
- `index.html` — the page (Spanish source text, styles inline)
- `js/i18n.js` — ES/EN toggle; English strings keyed by the exact Spanish text
- `js/chat.js` — AI chat widget (calls `/api/chat`)
- `api/chat.js` — Vercel serverless function that calls OpenAI (key stays server-side)
- `api/knowledge.js` — business knowledge the assistant answers from
- `assets/` — logo, hero image and service flyers (web-optimized)
- `vercel.json` — clean URLs and cache headers for assets

## Local preview
`npm install && npm start` → http://localhost:3000 (chat included, needs `OPENAI_API_KEY`), or `npx vercel dev`. Opening `index.html` directly works except for the chat.

## Deploy (Hostinger — Node.js app)
1. hPanel → Websites → Add website → **Node.js Apps** → import this GitHub repo (branch `main`).
2. Framework: **Express** (or Other) · Node version **18+** · Build command: *(empty)* · Start command / entry file: `npm start` / `server.js`.
3. Environment variables: `OPENAI_API_KEY` (required), optional `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy, then point the domain to the app.
`server.js` serves the static files and mounts the same `api/chat.js` handler used on Vercel. Server-side files (`/api/*.js`, `server.js`, `package.json`) are never served.

## Deploy (Vercel)
Import the repo in Vercel → Framework preset: **Other** → no build command, output directory `.`.

## Environment variables (Vercel → Settings → Environment Variables)
| Name | Required | Default |
|---|---|---|
| `OPENAI_API_KEY` | yes | — |
| `OPENAI_MODEL` | no | `gpt-5-mini` |
| `SUPABASE_URL` | no | — (enables saving chat logs to table `chat_logs`) |
| `SUPABASE_SERVICE_ROLE_KEY` | no | — |
| `OPENAI_REASONING_EFFORT` | no | `low` (only for gpt-5 / o-series models) |

Redeploy after adding or changing a variable.

## Chat safeguards
- Answers only from `api/knowledge.js`; never gives legal advice or eligibility opinions.
- Max 600 chars per message, last 12 messages sent, ~20 requests per IP every 10 min (best effort).
- Requests from other origins are rejected.

## Anonymous chat logs
Each question/answer is redacted (emails, phones, A-numbers, SSN-like numbers, dates, passport-like ids → `[dato oculto]`) and written to Vercel runtime logs (search `chat_log`). No IP or name is stored. To also keep them in Supabase, create:
```sql
create table chat_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text, lang text, question text, answer text
);
alter table chat_logs enable row level security; -- only the service role key can write/read
-- 90-day retention (pg_cron): select cron.schedule('purge_chat_logs','0 3 * * *',$$delete from chat_logs where created_at < now() - interval '90 days'$$);
```
then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel and redeploy.

## Pending
- Contact email and social media links
- Custom domain
