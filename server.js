// Node/Express server for hosts that run a Node.js app (e.g. Hostinger).
// Serves the static site and mounts the same /api/chat handler used on Vercel.
// Env: PORT (set by the host), OPENAI_API_KEY, optional OPENAI_MODEL, OPENAI_REASONING_EFFORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const path = require('path');
const express = require('express');
const chat = require('./api/chat');

const app = express();
const root = __dirname;

app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '32kb' }));

app.all('/api/chat', (req, res) => chat(req, res));

// Never expose server-side source files
app.use(['/api', '/server.js', '/package.json', '/package-lock.json', '/node_modules', '/.git'], (req, res) => res.status(404).end());

app.use('/assets', express.static(path.join(root, 'assets'), { maxAge: '7d' }));
app.use('/js', express.static(path.join(root, 'js'), { maxAge: '1h' }));
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(root, 'index.html')));
app.use((req, res) => res.status(404).sendFile(path.join(root, 'index.html')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`FY landing running on port ${port}`));
