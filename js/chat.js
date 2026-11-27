(function () {
  var EMAIL = 'syedalihussainatif@gmail.com';
  var MAX_MESSAGES = 60;
  var messages = [], saved = false, busy = false, speakOn = false, listening = false, rec = null;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var synth = window.speechSynthesis;
  var I = {
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V22h2v-3.1A7 7 0 0 0 19 12z"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5v6.6L15 12 3 13.9z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zm11.5 3a3.5 3.5 0 0 0-2-3.2v6.4a3.5 3.5 0 0 0 2-3.2zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>'
  };

  var root = document.createElement('div');
  root.className = 'hira';
  root.innerHTML =
    '<button class="hira-toggle" type="button" aria-expanded="false" aria-controls="hira-panel"><span class="hira-pulse"></span>Ask Hira</button>' +
    '<section class="hira-panel" id="hira-panel" aria-label="Chat with Hira, an AI assistant" hidden>' +
      '<header class="hira-head"><span class="hira-avatar">H</span>' +
      '<div class="hira-id"><strong>Hira</strong><span><i class="hira-online"></i>AI assistant for Ali\u2019s portfolio</span></div>' +
      '<button class="hira-ico hira-speak" type="button" aria-pressed="false" aria-label="Read replies aloud" title="Read replies aloud">' + I.sound + '</button>' +
      '<button class="hira-ico hira-close" type="button" aria-label="Close chat">' + I.close + '</button></header>' +
      '<div class="hira-log" role="log" aria-live="polite"></div>' +
      '<div class="hira-chips"></div>' +
      '<form class="hira-form"><button class="hira-ico hira-mic" type="button" aria-pressed="false" aria-label="Speak your message" title="Speak your message">' + I.mic + '</button>' +
      '<input type="text" maxlength="500" placeholder="Type or speak your message" aria-label="Your message" autocomplete="off">' +
      '<button class="hira-send" type="submit" aria-label="Send">' + I.send + '</button></form>' +
      '<p class="hira-note"><span>Hira is an AI. Details you share are used only so Ali can reply.</span>' +
      '<select class="hira-lang" aria-label="Voice language"><option value="en-US">English</option><option value="ur-PK">\u0627\u0631\u062f\u0648</option></select></p>' +
    '</section>';
  document.body.appendChild(root);

  var $ = function (s) { return root.querySelector(s); };
  var toggle = $('.hira-toggle'), panel = $('.hira-panel'), log = $('.hira-log'), chips = $('.hira-chips');
  var form = $('.hira-form'), input = form.querySelector('input'), sendBtn = $('.hira-send');
  var micBtn = $('.hira-mic'), speakBtn = $('.hira-speak'), lang = $('.hira-lang');
  if (!SR) micBtn.hidden = true;
  if (!synth) speakBtn.hidden = true;
  if (!SR && !synth) lang.hidden = true;

  function add(cls, text) {
    var el = document.createElement('div');
    el.className = 'hira-msg ' + cls;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
  function typingEl() {
    var el = document.createElement('div');
    el.className = 'hira-msg bot hira-typing';
    el.setAttribute('aria-label', 'Hira is typing');
    el.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
  function speak(t) {
    if (!speakOn || !synth) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(t);
    u.lang = lang.value;
    synth.speak(u);
  }
  function setOpen(open) {
    panel.hidden = !open;
    root.classList.toggle('open', open);
    document.documentElement.classList.toggle('hira-lock', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      if (!log.children.length) {
        add('bot', 'Hi, I\u2019m Hira, Ali\u2019s AI assistant. Ask me about his research, skills or services, or tell me about a project you have in mind.');
        ['What does Ali research?', 'Which services does Ali offer?', 'I want to hire Ali'].forEach(function (q) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'hira-chip'; b.textContent = q;
          b.addEventListener('click', function () { send(q); });
          chips.appendChild(b);
        });
      }
      input.focus();
    } else {
      if (synth) synth.cancel();
      if (rec && listening) rec.stop();
      toggle.focus();
    }
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (messages.length >= MAX_MESSAGES) { add('bot', 'This chat has reached its limit. Please email Ali at ' + EMAIL + '.'); return; }
    chips.hidden = true;
    input.value = '';
    messages.push({ role: 'user', content: text });
    add('me', text);
    busy = true; sendBtn.disabled = true;
    var typing = typingEl();
    fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: messages, saved: saved }) })
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
        speak(res.data.reply);
      })
      .catch(function () {
        typing.remove(); messages.pop();
        add('bot', 'Hira is unavailable right now. Please email Ali at ' + EMAIL + '.');
      })
      .then(function () { busy = false; sendBtn.disabled = false; input.focus(); });
  }

  function listen() {
    if (!SR || busy) return;
    if (listening) { rec.stop(); return; }
    if (synth) synth.cancel();
    var finalText = '';
    rec = new SR();
    rec.lang = lang.value;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onstart = function () { listening = true; micBtn.classList.add('on'); micBtn.setAttribute('aria-pressed', 'true'); input.placeholder = 'Listening\u2026'; };
    rec.onresult = function (e) {
      var t = '';
      for (var i = 0; i < e.results.length; i++) { t += e.results[i][0].transcript; if (e.results[i].isFinal) finalText = t; }
      input.value = t;
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') add('bot', 'Microphone access is blocked. Please allow it in your browser settings, or type your message.');
      else if (e.error !== 'no-speech' && e.error !== 'aborted') add('bot', 'I could not hear that clearly. Please try again or type your message.');
    };
    rec.onend = function () {
      listening = false; micBtn.classList.remove('on'); micBtn.setAttribute('aria-pressed', 'false'); input.placeholder = 'Type or speak your message';
      if (finalText) send(finalText); else input.value = '';
    };
    try { rec.start(); } catch (e) { /* already started */ }
  }

  toggle.addEventListener('click', function () { setOpen(panel.hidden); });
  $('.hira-close').addEventListener('click', function () { setOpen(false); });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  micBtn.addEventListener('click', listen);
  speakBtn.addEventListener('click', function () {
    speakOn = !speakOn;
    speakBtn.classList.toggle('on', speakOn);
    speakBtn.setAttribute('aria-pressed', String(speakOn));
    if (!speakOn && synth) synth.cancel();
  });
  document.querySelectorAll('[data-open-hira]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); if (panel.hidden) setOpen(true); else input.focus(); });
  });
})();
