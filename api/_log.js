// Anonymous chat logging. Files starting with "_" are not exposed as routes by Vercel.
// Always: writes a redacted line to Vercel runtime logs.
// Optional: MySQL (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME) creates/uses table `chat_logs` with 90-day retention.
// Optional: if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, inserts into Supabase table `chat_logs`
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
  const keep = { '+1 (678) 361-9234': '§1', '+1 (470) 778-1210': '§2', '16783619234': '§3', '14707781210': '§4', 'info@fy.solutionsbusiness.org': '§5' };
  let s = String(text || '');
  for (const [k, v] of Object.entries(keep)) s = s.split(k).join(v);
  s = redact(s);
  for (const [k, v] of Object.entries(keep)) s = s.split(v).join(k);
  return s;
}

// ---- MySQL (Hostinger) — enabled when DB_HOST, DB_USER, DB_NAME are set ----
const RETENTION_DAYS = Number(process.env.CHAT_LOG_RETENTION_DAYS || 90);
let pool = null;
let tableReady = null;

function mysqlEnabled() {
  return !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
}

function getPool() {
  if (!pool) {
    const mysql = require('mysql2/promise'); // lazy: only loaded when MySQL is configured
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      connectionLimit: 3,
      connectTimeout: 5000,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

function ensureTable() {
  if (!tableReady) {
    tableReady = getPool().query(`CREATE TABLE IF NOT EXISTS chat_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      session_id VARCHAR(40) NULL,
      lang CHAR(2) NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      INDEX idx_created (created_at),
      INDEX idx_session (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).catch((e) => { tableReady = null; throw e; });
  }
  return tableReady;
}

async function saveMysql(row) {
  await ensureTable();
  const db = getPool();
  await db.execute('INSERT INTO chat_logs (session_id, lang, question, answer) VALUES (?, ?, ?, ?)', [row.session_id, row.lang, row.question, row.answer]);
  if (Math.random() < 0.05) {
    await db.execute('DELETE FROM chat_logs WHERE created_at < (NOW() - INTERVAL ? DAY)', [RETENTION_DAYS]);
  }
}

async function logChat({ sessionId, lang, question, answer }) {
  const row = {
    session_id: String(sessionId || '').replace(/[^\w-]/g, '').slice(0, 40) || null,
    lang,
    question: redact(question).slice(0, 600),
    answer: redactAnswer(answer).slice(0, 2000),
  };
  console.log('chat_log', JSON.stringify(row));

  if (mysqlEnabled()) {
    try { await saveMysql(row); } catch (e) { console.error('chat_log_mysql_failed', e.code || e.message); }
  }

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
