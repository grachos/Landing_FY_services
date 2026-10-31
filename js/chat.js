(function () {
  const t = (s) => window.FY_LANG.t(s);
  const fab = document.getElementById('chat-fab');
  const panel = document.getElementById('chat');
  const log = document.getElementById('chat-log');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');
  const chips = document.getElementById('chat-chips');
  const history = [];
  const WELCOME = {
    es: '¡Hola! Soy el asistente de FY. Te cuento sobre nuestros servicios, horarios y cómo contactarnos. ¿En qué te ayudo?',
    en: "Hi! I'm the FY assistant. I can tell you about our services, hours and how to reach us. How can I help?",
  };
  const ERR = {
    rate_limited: { es: 'Has enviado muchos mensajes. Espera unos minutos o escríbenos por WhatsApp.', en: 'Too many messages. Please wait a few minutes or message us on WhatsApp.' },
    default: { es: 'No pude responder ahora. Escríbenos por WhatsApp: Ysbell +1 (678) 361-9234 o Franklin +1 (470) 778-1210.', en: "I couldn't answer right now. Message us on WhatsApp: Ysbell +1 (678) 361-9234 or Franklin +1 (470) 778-1210." },
  };

  function bubble(role, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + role;
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  function welcome() {
    if (!history.length) { log.innerHTML = ''; bubble('assistant', WELCOME[window.FY_LANG.get()]); }
  }
  function open(v) {
    panel.hidden = !v;
    fab.setAttribute('aria-expanded', String(v));
    document.body.classList.toggle('chat-open', v);
    if (v) { welcome(); setTimeout(() => input.focus(), 50); }
  }
  async function ask(text) {
    text = text.trim().slice(0, 600);
    if (!text || send.disabled) return;
    chips.hidden = true;
    bubble('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    send.disabled = true;
    const typing = bubble('assistant typing', '…');
    const lang = window.FY_LANG.get();
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12), lang }),
      });
      const data = await r.json().catch(() => ({}));
      typing.remove();
      if (!r.ok || !data.reply) {
        history.pop();
        bubble('assistant error', (ERR[data.error] || ERR.default)[lang]);
      } else {
        history.push({ role: 'assistant', content: data.reply });
        bubble('assistant', data.reply);
      }
    } catch (e) {
      typing.remove();
      history.pop();
      bubble('assistant error', ERR.default[lang]);
    } finally {
      send.disabled = false;
      input.focus();
    }
  }

  fab.addEventListener('click', () => open(panel.hidden));
  document.getElementById('chat-x').addEventListener('click', () => { open(false); fab.focus(); });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { open(false); fab.focus(); } });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  chips.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) ask(b.textContent); });
  document.addEventListener('fy:lang', () => { if (!history.length && !panel.hidden) welcome(); });
})();
