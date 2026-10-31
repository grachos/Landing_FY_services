// Anonymous chat logging. Files starting with "_" are not exposed as routes by Vercel.
// Always: writes a redacted line to Vercel runtime logs.
// Optional: if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, inserts into table `chat_logs`
//   (id bigint identity, created_at timestamptz default now(), session_id text, lang text, question text, answer text).

const HIDDEN = '[dato oculto]';

function redact(text) {
  return String(text || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, HIDDEN)                                  // emails
    .replace(/\bA[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/gi, HIDDEN)                   // A-numbers
    .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, HIDDEN)                          // SSN-like
    .replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, HIDDEN)                    // dates (e.g. birth dates)
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, (m) => (m.replace(/\D/g, '').length >= 8 ? HIDDEN : m)) // phones / long ids
    .replace(/\b[A-Z]{1,2}\d{6,9}\b/g, HIDDEN);                                   // passport-like
}

// Our own WhatsApp numbers appear in answers on purpose; keep them readable.
function redactAnswer(text) {
  const keep = { '+1 (678) 361-9234': '§1', '+1 (470) 778-1210': '§2', '16783619234': '§3', '14707781210': '§4' };
  let s = String(text || '');
  for (const [k, v] of Object.entries(keep)) s = s.split(k).join(v);
  s = redact(s);
  for (const [k, v] of Object.entries(keep)) s = s.split(v).join(k);
  return s;
}

async function logChat({ sessionId, lang, question, answer }) {
  const row = {
    session_id: String(sessionId || '').replace(/[^\w-]/g, '').slice(0, 40) || null,
    lang,
    question: redact(question).slice(0, 600),
    answer: redactAnswer(answer).slice(0, 2000),
  };
  console.log('chat_log', JSON.stringify(row));

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/chat_logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!r.ok) console.error('chat_log_db_failed', r.status);
  } catch (e) {
    console.error('chat_log_db_failed', e.message);
  }
}

module.exports = { logChat, redact };
