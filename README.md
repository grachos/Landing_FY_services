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
`npx vercel dev` (runs the chat API too). Opening `index.html` directly works except for the chat.

## Deploy (Vercel)
Import the repo in Vercel → Framework preset: **Other** → no build command, output directory `.`.

## Environment variables (Vercel → Settings → Environment Variables)
| Name | Required | Default |
|---|---|---|
| `OPENAI_API_KEY` | yes | — |
| `OPENAI_MODEL` | no | `gpt-5-mini` |
| `OPENAI_REASONING_EFFORT` | no | `low` (only for gpt-5 / o-series models) |

Redeploy after adding or changing a variable.

## Chat safeguards
- Answers only from `api/knowledge.js`; never gives legal advice or eligibility opinions.
- Max 600 chars per message, last 12 messages sent, ~20 requests per IP every 10 min (best effort).
- Requests from other origins are rejected.

## Pending
- Contact email and social media links
- Custom domain
