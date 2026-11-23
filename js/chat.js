(function () {
  var EMAIL = 'syedalihussainatif@gmail.com';
  var MAX_MESSAGES = 24;
  var messages = [];
  var saved = false;
  var busy = false;

  var root = document.createElement('div');
  root.className = 'hira';
  root.innerHTML =
    '<button class="hira-toggle" type="button" aria-expanded="false" aria-controls="hira-panel">Chat with Hira</button>' +
    '<section class="hira-panel" id="hira-panel" aria-label="Chat with Hira, an AI assistant" hidden>' +
      '<header class="hira-head"><div><strong>Hira</strong><span>AI assistant for Ali\u2019s portfolio</span></div>' +
      '<button class="hira-close" type="button" aria-label="Close chat">\u00d7</button></header>' +
      '<div class="hira-log" role="log" aria-live="polite"></div>' +
      '<p class="hira-note">Hira is an AI. Details you share are used only so Ali can reply.</p>' +
      '<form class="hira-form"><input type="text" maxlength="500" placeholder="Type a message" aria-label="Your message" autocomplete="off">' +
      '<button type="submit">Send</button></form>' +
    '</section>';
  document.body.appendChild(root);

  var toggle = root.querySelector('.hira-toggle');
  var panel = root.querySelector('.hira-panel');
  var log = root.querySelector('.hira-log');
  var form = root.querySelector('.hira-form');
  var input = form.querySelector('input');
  var sendBtn = form.querySelector('button');

  function add(role, text) {
    var el = document.createElement('div');
    el.className = 'hira-msg ' + role;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      if (!log.children.length) add('bot', 'Hi, I\u2019m Hira, Ali\u2019s AI assistant. Ask me about his research, skills or services, or tell me about a project you have in mind.');
      input.focus();
    } else {
      toggle.focus();
    }
  }

  toggle.addEventListener('click', function () { setOpen(panel.hidden); });
  root.querySelector('.hira-close').addEventListener('click', function () { setOpen(false); });
  document.querySelectorAll('[data-open-hira]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); if (panel.hidden) setOpen(true); else input.focus(); });
  });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    if (messages.length >= MAX_MESSAGES) {
      add('bot', 'This chat has reached its limit. Please email Ali at ' + EMAIL + '.');
      return;
    }
    input.value = '';
    messages.push({ role: 'user', content: text });
    add('me', text);
    busy = true;
    sendBtn.disabled = true;
    var typing = add('bot typing', 'Hira is typing\u2026');

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages, saved: saved })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        typing.remove();
        if (!res.ok || !res.data.reply) {
          add('bot', (res.data && res.data.error) || 'Hira is unavailable right now. Please email Ali at ' + EMAIL + '.');
          messages.pop();
          return;
        }
        saved = res.data.saved === true;
        messages.push({ role: 'assistant', content: res.data.reply });
        add('bot', res.data.reply);
      })
      .catch(function () {
        typing.remove();
        messages.pop();
        add('bot', 'Hira is unavailable right now. Please email Ali at ' + EMAIL + '.');
      })
      .then(function () {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      });
  });
})();
