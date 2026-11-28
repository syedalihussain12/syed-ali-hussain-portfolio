(function () {
  'use strict';
  var EMAIL = 'syedalihussainatif@gmail.com';

  /* ---------- Site: navigation, year, contact form ---------- */
  var menuButton = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', function () {
      menuButton.setAttribute('aria-expanded', String(nav.classList.toggle('open')));
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
  }
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(contactForm);
      var subject = encodeURIComponent('Portfolio enquiry from ' + d.get('name'));
      var body = encodeURIComponent('Name: ' + d.get('name') + '\nEmail: ' + d.get('email') + '\n\n' + d.get('message'));
      window.location.href = 'mailto:' + EMAIL + '?subject=' + subject + '&body=' + body;
    });
  }

  /* ---------- Hira chat (same behaviour and API contract as before) ---------- */
  var MAX_MESSAGES = 60;
  var messages = [], saved = false, lead = false, known = null, asked = null, busy = false, speakOn = false, listening = false, rec = null;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var synth = window.speechSynthesis;

  var widget = document.getElementById('hiraWidget');
  var launcher = document.getElementById('hiraLauncher');
  var panel = document.getElementById('hiraChatPanel');
  var log = document.getElementById('hiraMessages');
  var form = document.getElementById('hiraChatForm');
  var input = document.getElementById('hiraChatInput');
  var sendBtn = form.querySelector('.hira-send');
  var micBtn = document.getElementById('hiraMic');
  var speakBtn = document.getElementById('hiraSpeak');
  var lang = document.getElementById('hiraLang');
  var suggestions = document.getElementById('hiraSuggestions');

  if (!SR) micBtn.hidden = true;
  if (!synth) speakBtn.hidden = true;
  if (!SR && !synth) lang.hidden = true;

  function isOpen() { return panel.classList.contains('is-open'); }

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function add(role, text) {
    var row = document.createElement('div');
    row.className = 'hira-message ' + role;
    if (role === 'assistant') {
      var av = document.createElement('div');
      av.className = 'hira-message-avatar';
      var img = document.createElement('img');
      img.src = 'assets/hira-assistant.jpg'; img.alt = '';
      av.appendChild(img);
      row.appendChild(av);
    }
    var b = document.createElement('div');
    b.className = 'hira-bubble';
    b.textContent = text;
    row.appendChild(b);
    log.appendChild(row);
    scrollDown();
    return row;
  }

  function typingEl() {
    var row = document.createElement('div');
    row.className = 'hira-message assistant';
    row.setAttribute('aria-label', 'Hira is typing');
    row.innerHTML = '<div class="hira-message-avatar"><img src="assets/hira-assistant.jpg" alt=""></div><div class="hira-bubble hira-typing"><span></span><span></span><span></span></div>';
    log.appendChild(row);
    scrollDown();
    return row;
  }

  // Hira is a woman, so pick a female voice when the device has one.
  var FEMALE = /(female|zira|aria|jenny|samantha|karen|moira|tessa|victoria|susan|hazel|libby|sonia|natasha|catherine|fiona|veena|heera|kalpana|priya|uzma|salma|michelle|emma|ava|allison|joanna|kimberly|ivy|amy|salli|nicole|raveena|serena|zoe|ellen|sara|laura)/i;
  var MALE = /(\bmale\b|david|mark|guy|ryan|george|james|richard|daniel|alex|fred|asad|ravi|hemant|thomas|brian|eric|liam|matthew|joey|justin|kevin|russell|geraint|rishi|oliver|arthur|aaron)/i;
  function pickVoice(code) {
    if (!synth || !synth.getVoices) return null;
    var base = code.slice(0, 2).toLowerCase(), want = code.toLowerCase(), best = null, bestScore = -99;
    synth.getVoices().forEach(function (v) {
      var l = String(v.lang || '').replace('_', '-').toLowerCase();
      if (l.indexOf(base) !== 0) return;
      var sc = (l === want ? 3 : 0) + (FEMALE.test(v.name) ? 10 : 0) - (MALE.test(v.name) ? 10 : 0) + (/online|natural|neural/i.test(v.name) ? 2 : 0);
      if (sc > bestScore) { bestScore = sc; best = v; }
    });
    return best ? { voice: best, female: FEMALE.test(best.name) && !MALE.test(best.name) } : null;
  }
  if (synth) synth.onvoiceschanged = function () { synth.getVoices(); };
  function speak(t) {
    if (!speakOn || !synth) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(t);
    u.lang = lang.value;
    var pick = pickVoice(lang.value);
    if (pick) u.voice = pick.voice;
    u.pitch = pick && pick.female ? 1.05 : 1.3; // no female voice on this device: raise the pitch
    u.rate = 1;
    synth.speak(u);
  }

  function setOpen(open) {
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    widget.classList.toggle('open', open);
    document.documentElement.classList.toggle('hira-lock', open);
    launcher.setAttribute('aria-expanded', String(open));
    if (open) {
      setTimeout(function () { input.focus(); }, 180);
    } else {
      if (synth) synth.cancel();
      if (rec && listening) rec.stop();
    }
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (messages.length >= MAX_MESSAGES) { add('assistant', 'This chat has reached its limit. Please email Ali at ' + EMAIL + '.'); return; }
    if (suggestions) { suggestions.hidden = true; }
    input.value = '';
    messages.push({ role: 'user', content: text });
    add('user', text);
    busy = true; sendBtn.disabled = true;
    var typing = typingEl();
    fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: messages, saved: saved, lead: lead, known: known, asked: asked }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        typing.remove();
        if (!res.ok || !res.data.reply) {
          add('assistant', (res.data && res.data.error) || 'Hira is unavailable right now. Please email Ali at ' + EMAIL + '.');
          messages.pop();
          return;
        }
        saved = res.data.saved === true;
        lead = res.data.lead === true;
        known = res.data.known || null;
        asked = res.data.asked || null;
        messages.push({ role: 'assistant', content: res.data.reply });
        add('assistant', res.data.reply);
        speak(res.data.reply);
      })
      .catch(function () {
        typing.remove(); messages.pop();
        add('assistant', 'Hira is unavailable right now. Please email Ali at ' + EMAIL + '.');
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
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') add('assistant', 'Microphone access is blocked. Please allow it in your browser settings, or type your message.');
      else if (e.error !== 'no-speech' && e.error !== 'aborted') add('assistant', 'I could not hear that clearly. Please try again or type your message.');
    };
    rec.onend = function () {
      listening = false; micBtn.classList.remove('on'); micBtn.setAttribute('aria-pressed', 'false'); input.placeholder = 'Type or speak your message';
      if (finalText) send(finalText); else input.value = '';
    };
    try { rec.start(); } catch (e) { /* already started */ }
  }

  launcher.addEventListener('click', function () { setOpen(!isOpen()); if (isOpen() === false) launcher.focus(); });
  document.getElementById('hiraClose').addEventListener('click', function () { setOpen(false); launcher.focus(); });
  document.getElementById('hiraMinimize').addEventListener('click', function () { setOpen(false); launcher.focus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { setOpen(false); launcher.focus(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  micBtn.addEventListener('click', listen);
  speakBtn.addEventListener('click', function () {
    speakOn = !speakOn;
    speakBtn.classList.toggle('on', speakOn);
    speakBtn.setAttribute('aria-pressed', String(speakOn));
    if (!speakOn && synth) synth.cancel();
  });
  document.querySelectorAll('.hira-suggestions [data-prompt]').forEach(function (b) {
    b.addEventListener('click', function () { send(b.getAttribute('data-prompt')); });
  });
  document.querySelectorAll('[data-open-hira]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); if (!isOpen()) setOpen(true); else input.focus(); });
  });
})();
