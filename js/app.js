// BIOL 1030 study site. Plain JS, no dependencies.
// Views: guide, vocab, concepts, cards, practice, missed, search.
// Routing is hash based: #guide/ch7, #vocab/ch3, #practice/ch5, #search/edge effect
(function () {
  'use strict';

  var CH = window.CHAPTERS;
  var QS = window.QUESTIONS;
  var chById = {};
  CH.forEach(function (c) { chById[c.id] = c; });

  // ---------- storage ----------
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  var practice = store.get('es_practice', {});   // qid -> { status: 'right'|'wrong', tries: n }
  var cardsState = store.get('es_cards', {});    // cardKey -> 'know' | 'learn'
  var ui = store.get('es_ui', {});               // remembered selections

  function saveUi() { store.set('es_ui', ui); }

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function letter(i) { return String.fromCharCode(65 + i); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function chShort(id) { return chById[id] ? chById[id].short : id; }
  function allChapterIds() { return CH.map(function (c) { return c.id; }); }

  function chapterChecks(name, selected, withButtons) {
    var html = '<div class="checks" data-group="' + name + '">';
    CH.forEach(function (c) {
      var on = selected.indexOf(c.id) !== -1;
      html += '<label><input type="checkbox" value="' + c.id + '"' + (on ? ' checked' : '') + '> ' + esc(c.short) + '</label>';
    });
    html += '</div>';
    if (withButtons) {
      html += '<div class="btn-row"><button class="btn sm" data-act="all">Select all</button><button class="btn sm" data-act="none">Select none</button></div>';
    }
    return html;
  }
  function readChecks(root, name) {
    return qsa('.checks[data-group="' + name + '"] input:checked', root).map(function (i) { return i.value; });
  }

  // vocab and concept flat lists
  var VOCAB = [];
  var CONCEPTS = [];
  CH.forEach(function (c, ci) {
    c.vocab.forEach(function (v) { VOCAB.push({ term: v[0], def: v[1], ch: c.id, order: ci }); });
    c.concepts.forEach(function (v) { CONCEPTS.push({ term: v[0], def: v[1], ch: c.id, order: ci }); });
  });

  // ---------- routing ----------
  var view = document.getElementById('view');
  function route() {
    var hash = decodeURIComponent(location.hash || '#guide').slice(1);
    var parts = hash.split('/');
    var tab = parts[0] || 'guide';
    var arg = parts.slice(1).join('/');
    qsa('#tabs a').forEach(function (a) { a.classList.toggle('active', a.dataset.tab === tab); });
    window.scrollTo(0, 0);
    switch (tab) {
      case 'vocab': renderTable('vocab', arg); break;
      case 'concepts': renderTable('concepts', arg); break;
      case 'cards': renderCards(arg); break;
      case 'practice': renderPractice(arg); break;
      case 'missed': renderMissed(); break;
      case 'search': renderSearch(arg); break;
      default: renderGuide(arg);
    }
  }
  window.addEventListener('hashchange', route);

  // ---------- practice progress per chapter (for sidebar bars) ----------
  function chapterProgress(chId) {
    var qs = QS.filter(function (q) { return q.ch === chId; });
    var right = qs.filter(function (q) { return practice[q.id] && practice[q.id].status === 'right'; }).length;
    return { total: qs.length, right: right };
  }

  // ---------- STUDY GUIDE ----------
  function renderGuide(chId) {
    var ch = chById[chId] || CH[0];
    var side = '<div class="panel side"><h3 style="margin-top:0">Chapters</h3><ul class="side-list">';
    CH.forEach(function (c) {
      var p = chapterProgress(c.id);
      var pct = p.total ? Math.round(100 * p.right / p.total) : 0;
      side += '<li><a href="#guide/' + c.id + '"' + (c.id === ch.id ? ' class="active"' : '') + '>' +
        esc(c.short) + '<span class="bar" title="Practice questions answered correctly"><span style="width:' + pct + '%"></span></span></a></li>';
    });
    side += '</ul><p class="small muted" style="margin:10px 0 0">Bars show practice questions you have answered correctly.</p></div>';

    var qs = QS.filter(function (q) { return q.ch === ch.id; });
    var missed = qs.filter(function (q) { return q.missed; });

    var main = '<div>';
    main += '<div class="panel">';
    main += '<h2>' + esc(ch.title) + '</h2>';
    main += '<p class="muted small">Matching quiz: ' + esc(ch.quiz) + '</p>';
    main += '<p>' + esc(ch.overview) + '</p>';
    main += '<div class="stats">' +
      '<span class="chip plain">' + ch.guide.length + ' exam-guide questions</span>' +
      '<span class="chip plain">' + ch.vocab.length + ' vocab terms</span>' +
      '<span class="chip plain">' + ch.concepts.length + ' concepts</span>' +
      '<span class="chip plain">' + qs.length + ' quiz questions</span>' +
      (missed.length ? '<span class="chip bad">' + missed.length + ' missed on the quiz</span>' : '<span class="chip good">nothing missed on the quiz</span>') +
      '</div>';
    main += '<div class="btn-row">' +
      '<a class="btn primary" href="#practice/' + ch.id + '">Practice this chapter</a>' +
      '<a class="btn" href="#cards/' + ch.id + '">Flashcards</a>' +
      '<a class="btn" href="#vocab/' + ch.id + '">Vocab table</a>' +
      '<a class="btn" href="#concepts/' + ch.id + '">Concept table</a>' +
      '</div>';
    main += '</div>';

    main += '<h3>Exam guide questions <button class="btn sm" id="toggleAll">Expand all</button></h3>';
    main += '<p class="small muted">These are the questions from the Midterm I study guide, answered. Click a question to reveal the answer.</p>';
    ch.guide.forEach(function (g, i) {
      main += '<div class="qa"><div class="qa-q"><span class="tog">+</span><span>' + esc(g.q) + '</span></div>' +
        '<div class="qa-a hidden">' + esc(g.a) + '</div></div>';
    });

    if (missed.length) {
      main += '<h3>Quiz questions you missed in this chapter</h3>';
      missed.forEach(function (q) { main += renderMissedCard(q); });
    }

    main += '<h3>Key concepts</h3><div class="panel"><div class="vocab-inline">';
    ch.concepts.forEach(function (c) { main += '<div><b>' + esc(c[0]) + '</b>: ' + esc(c[1]) + '</div>'; });
    main += '</div></div>';

    main += '<h3>Vocabulary <button class="btn sm" id="toggleVocab">Show</button></h3><div class="panel hidden" id="vocabBlock"><div class="vocab-inline">';
    ch.vocab.forEach(function (v) { main += '<div><b>' + esc(v[0]) + '</b>: ' + esc(v[1]) + '</div>'; });
    main += '</div></div>';
    main += '</div>';

    view.innerHTML = '<div class="split">' + side + main + '</div>';

    qsa('.qa-q', view).forEach(function (el) {
      el.addEventListener('click', function () {
        var a = el.nextElementSibling;
        a.classList.toggle('hidden');
        el.querySelector('.tog').textContent = a.classList.contains('hidden') ? '+' : '-';
      });
    });
    var allOpen = false;
    document.getElementById('toggleAll').addEventListener('click', function () {
      allOpen = !allOpen;
      qsa('.qa', view).forEach(function (qa) {
        qa.querySelector('.qa-a').classList.toggle('hidden', !allOpen);
        qa.querySelector('.tog').textContent = allOpen ? '-' : '+';
      });
      this.textContent = allOpen ? 'Collapse all' : 'Expand all';
    });
    document.getElementById('toggleVocab').addEventListener('click', function () {
      var b = document.getElementById('vocabBlock');
      b.classList.toggle('hidden');
      this.textContent = b.classList.contains('hidden') ? 'Show' : 'Hide';
    });
  }

  function renderMissedCard(q) {
    var html = '<div class="q"><div class="q-head"><span class="chip bad">missed</span><span>' + esc(q.src) + '</span><span>' + esc(chShort(q.ch)) + '</span></div>';
    html += '<div class="q-text">' + esc(q.q) + '</div>';
    if (q.figure) html += '<div class="q-fig">Figure: ' + esc(q.figure) + '</div>';
    if (q.type === 'mc' || q.type === 'tf') {
      html += '<div class="opts">';
      q.options.forEach(function (o, i) {
        var cls = 'opt';
        if (i === q.answer) cls += ' right';
        else if (i === q.you) cls += ' wrong';
        html += '<div class="' + cls + '"><span class="letter">' + letter(i) + '.</span><span>' + esc(o) +
          (i === q.answer ? ' <b>(correct)</b>' : '') + (i === q.you ? ' <b>(your answer)</b>' : '') + '</span></div>';
      });
      html += '</div>';
    } else if (q.type === 'match') {
      q.pairs.forEach(function (p) {
        html += '<div class="match-row"><div>' + esc(p.p) + '</div><div><b>' + esc(p.a) + '</b></div></div>';
      });
    } else if (q.type === 'essay') {
      html += '<p><b>Your answer:</b> ' + esc(q.you) + '</p><p><b>Full-credit answer:</b> ' + esc(q.model) + '</p>';
    }
    html += '<div class="feedback info">' + esc(q.explain) + '</div></div>';
    return html;
  }

  // ---------- VOCAB / CONCEPT TABLES ----------
  function renderTable(kind, chArg) {
    var data = kind === 'vocab' ? VOCAB : CONCEPTS;
    var label = kind === 'vocab' ? 'term' : 'concept';
    var st = ui[kind] || { sort: 'ch', dir: 1, ch: 'all', q: '' };
    if (chArg) st.ch = chArg;
    ui[kind] = st; saveUi();

    var html = '<div class="panel"><h2>' + (kind === 'vocab' ? 'Master vocabulary list' : 'Master concept list') + '</h2>';
    html += '<p class="muted small">' + data.length + ' ' + label + 's across all chapters. Click a column header to sort. Filter by chapter or search within the table.</p>';
    html += '<div class="controls">';
    html += '<select id="chFilter"><option value="all">All chapters</option>';
    CH.forEach(function (c) { html += '<option value="' + c.id + '"' + (st.ch === c.id ? ' selected' : '') + '>' + esc(c.short) + '</option>'; });
    html += '</select>';
    html += '<input type="search" id="tblSearch" placeholder="Filter ' + label + 's..." value="' + esc(st.q) + '">';
    html += '<span id="tblCount" class="muted small"></span>';
    html += '<a class="btn sm" href="#cards/' + (st.ch === 'all' ? '' : st.ch) + '">Study these as flashcards</a>';
    html += '</div>';
    html += '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      '<th data-key="term">' + (kind === 'vocab' ? 'Term' : 'Concept') + '</th>' +
      '<th data-key="def">' + (kind === 'vocab' ? 'Definition' : 'Explanation') + '</th>' +
      '<th data-key="ch">Chapter</th></tr></thead><tbody id="tblBody"></tbody></table></div></div>';
    view.innerHTML = html;

    function draw() {
      var q = st.q.toLowerCase();
      var rows = data.filter(function (r) {
        if (st.ch !== 'all' && r.ch !== st.ch) return false;
        if (q && (r.term + ' ' + r.def).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      rows.sort(function (a, b) {
        var va, vb;
        if (st.sort === 'ch') { va = a.order; vb = b.order; if (va === vb) { va = a.term.toLowerCase(); vb = b.term.toLowerCase(); } }
        else { va = a[st.sort].toLowerCase(); vb = b[st.sort].toLowerCase(); }
        if (va < vb) return -st.dir;
        if (va > vb) return st.dir;
        return 0;
      });
      var body = '';
      rows.forEach(function (r) {
        body += '<tr><td class="term">' + esc(r.term) + '</td><td>' + esc(r.def) + '</td><td class="ch"><a href="#guide/' + r.ch + '">' + esc(chShort(r.ch)) + '</a></td></tr>';
      });
      document.getElementById('tblBody').innerHTML = body || '<tr><td colspan="3" class="empty">Nothing matches.</td></tr>';
      document.getElementById('tblCount').textContent = rows.length + ' shown';
      qsa('.tbl th', view).forEach(function (th) {
        th.classList.toggle('sorted', th.dataset.key === st.sort);
        th.classList.toggle('desc', th.dataset.key === st.sort && st.dir === -1);
      });
    }
    qsa('.tbl th', view).forEach(function (th) {
      th.addEventListener('click', function () {
        if (st.sort === th.dataset.key) st.dir = -st.dir; else { st.sort = th.dataset.key; st.dir = 1; }
        saveUi(); draw();
      });
    });
    document.getElementById('chFilter').addEventListener('change', function () { st.ch = this.value; saveUi(); draw(); });
    document.getElementById('tblSearch').addEventListener('input', function () { st.q = this.value; saveUi(); draw(); });
    draw();
  }

  // ---------- FLASHCARDS ----------
  function renderCards(chArg) {
    var st = ui.cards || { chs: allChapterIds(), source: 'vocab', side: 'term', onlyLearning: false };
    if (chArg) st.chs = [chArg];
    ui.cards = st; saveUi();

    var html = '<div class="panel"><h2>Flashcards</h2>';
    html += '<p class="muted small">Pick sections, flip cards, and mark each one Know it or Still learning. Keyboard: <kbd>space</kbd> flip, <kbd>left</kbd>/<kbd>right</kbd> move, <kbd>1</kbd> know, <kbd>2</kbd> learning.</p>';
    html += chapterChecks('cardChs', st.chs, true);
    html += '<div class="controls" style="margin-top:8px">';
    html += '<label>Deck: <select id="cardSource">' +
      '<option value="vocab"' + (st.source === 'vocab' ? ' selected' : '') + '>Vocabulary</option>' +
      '<option value="concepts"' + (st.source === 'concepts' ? ' selected' : '') + '>Concepts</option>' +
      '<option value="both"' + (st.source === 'both' ? ' selected' : '') + '>Vocabulary + concepts</option>' +
      '<option value="guide"' + (st.source === 'guide' ? ' selected' : '') + '>Exam-guide questions</option>' +
      '</select></label>';
    html += '<label>Front: <select id="cardSide">' +
      '<option value="term"' + (st.side === 'term' ? ' selected' : '') + '>Term (guess definition)</option>' +
      '<option value="def"' + (st.side === 'def' ? ' selected' : '') + '>Definition (guess term)</option>' +
      '</select></label>';
    html += '<label><input type="checkbox" id="onlyLearning"' + (st.onlyLearning ? ' checked' : '') + '> Only cards marked Still learning</label>';
    html += '<button class="btn sm" id="shuffleBtn">Shuffle</button>';
    html += '<button class="btn sm" id="resetDeck">Clear marks for this deck</button>';
    html += '</div></div>';
    html += '<div id="cardArea"></div>';
    view.innerHTML = html;

    var deck = [], idx = 0, flipped = false;

    function buildDeck() {
      var chs = readChecks(view, 'cardChs');
      st.chs = chs; saveUi();
      var items = [];
      chs.forEach(function (id) {
        var c = chById[id];
        if (st.source === 'vocab' || st.source === 'both') c.vocab.forEach(function (v) { items.push({ key: 'v:' + id + ':' + v[0], front: v[0], back: v[1], ch: id }); });
        if (st.source === 'concepts' || st.source === 'both') c.concepts.forEach(function (v) { items.push({ key: 'c:' + id + ':' + v[0], front: v[0], back: v[1], ch: id }); });
        if (st.source === 'guide') c.guide.forEach(function (g, i) { items.push({ key: 'g:' + id + ':' + i, front: g.q, back: g.a, ch: id, isGuide: true }); });
      });
      if (st.onlyLearning) items = items.filter(function (it) { return cardsState[it.key] === 'learn'; });
      deck = shuffle(items);
      idx = 0; flipped = false;
      drawCard();
    }

    function drawCard() {
      var area = document.getElementById('cardArea');
      if (!deck.length) { area.innerHTML = '<div class="empty">No cards match this selection.</div>'; return; }
      var c = deck[idx];
      var showTermFirst = c.isGuide ? true : st.side === 'term';
      var front = showTermFirst ? c.front : c.back;
      var back = showTermFirst ? c.back : c.front;
      var mark = cardsState[c.key];
      var known = deck.filter(function (d) { return cardsState[d.key] === 'know'; }).length;
      var learning = deck.filter(function (d) { return cardsState[d.key] === 'learn'; }).length;
      var h = '<div class="card-stage">';
      h += '<div class="card-meta">Card ' + (idx + 1) + ' of ' + deck.length + ' | ' + known + ' know it | ' + learning + ' still learning | ' + (deck.length - known - learning) + ' unmarked</div>';
      h += '<div class="card' + (mark === 'know' ? ' known' : mark === 'learn' ? ' learning' : '') + '" id="theCard" tabindex="0">' +
        '<span class="face-label">' + (flipped ? 'back' : 'front - click to flip') + '</span>' +
        '<span class="ch-label">' + esc(chShort(c.ch)) + (mark ? ' | ' + (mark === 'know' ? 'know it' : 'still learning') : '') + '</span>' +
        (flipped ? '<div class="back">' + esc(back) + '</div>' : '<div class="front">' + esc(front) + '</div>') + '</div>';
      h += '<div class="btn-row">' +
        '<button class="btn" id="prevCard">&lt; Prev</button>' +
        '<button class="btn primary" id="flipCard">Flip</button>' +
        '<button class="btn" id="nextCard">Next &gt;</button>' +
        '</div>';
      h += '<div class="btn-row">' +
        '<button class="btn" id="markKnow" style="border-color:var(--good)">Know it (1)</button>' +
        '<button class="btn" id="markLearn" style="border-color:var(--warn)">Still learning (2)</button>' +
        '</div></div>';
      area.innerHTML = h;
      document.getElementById('theCard').addEventListener('click', flip);
      document.getElementById('flipCard').addEventListener('click', flip);
      document.getElementById('prevCard').addEventListener('click', prev);
      document.getElementById('nextCard').addEventListener('click', next);
      document.getElementById('markKnow').addEventListener('click', function () { mark_('know'); });
      document.getElementById('markLearn').addEventListener('click', function () { mark_('learn'); });
    }
    function flip() { flipped = !flipped; drawCard(); }
    function next() { if (!deck.length) return; idx = (idx + 1) % deck.length; flipped = false; drawCard(); }
    function prev() { if (!deck.length) return; idx = (idx - 1 + deck.length) % deck.length; flipped = false; drawCard(); }
    function mark_(m) {
      if (!deck.length) return;
      cardsState[deck[idx].key] = m; store.set('es_cards', cardsState);
      next();
    }
    function onKey(e) {
      if (location.hash.indexOf('#cards') !== 0) { document.removeEventListener('keydown', onKey); return; }
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === ' ') { e.preventDefault(); flip(); }
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === '1') mark_('know');
      else if (e.key === '2') mark_('learn');
    }
    document.addEventListener('keydown', onKey);

    qsa('.checks[data-group="cardChs"] input', view).forEach(function (i) { i.addEventListener('change', buildDeck); });
    qsa('[data-act]', view).forEach(function (b) {
      b.addEventListener('click', function () {
        var on = b.dataset.act === 'all';
        qsa('.checks[data-group="cardChs"] input', view).forEach(function (i) { i.checked = on; });
        buildDeck();
      });
    });
    document.getElementById('cardSource').addEventListener('change', function () { st.source = this.value; saveUi(); buildDeck(); });
    document.getElementById('cardSide').addEventListener('change', function () { st.side = this.value; saveUi(); buildDeck(); });
    document.getElementById('onlyLearning').addEventListener('change', function () { st.onlyLearning = this.checked; saveUi(); buildDeck(); });
    document.getElementById('shuffleBtn').addEventListener('click', buildDeck);
    document.getElementById('resetDeck').addEventListener('click', function () {
      deck.forEach(function (d) { delete cardsState[d.key]; });
      store.set('es_cards', cardsState);
      buildDeck();
    });
    buildDeck();
  }

  // ---------- PRACTICE ----------
  function renderPractice(chArg) {
    var st = ui.practice || { chs: allChapterIds(), filter: 'all', instant: true, order: 'quiz' };
    if (chArg === 'missed') { st.chs = allChapterIds(); st.filter = 'missed'; }
    else if (chArg) { st.chs = [chArg]; }
    ui.practice = st; saveUi();

    var html = '<div class="panel"><h2>Practice questions</h2>';
    html += '<p class="muted small">Every question from the seven quizzes, sorted by chapter. Pick an answer to check it. Questions you missed on the real quiz are tagged. Your results are saved so you can come back to the ones you got wrong.</p>';
    html += chapterChecks('pChs', st.chs, true);
    html += '<div class="controls" style="margin-top:8px">';
    html += '<label>Show: <select id="pFilter">' +
      '<option value="all"' + (st.filter === 'all' ? ' selected' : '') + '>All questions</option>' +
      '<option value="missed"' + (st.filter === 'missed' ? ' selected' : '') + '>Missed on the real quiz</option>' +
      '<option value="wrong"' + (st.filter === 'wrong' ? ' selected' : '') + '>Got wrong here</option>' +
      '<option value="unanswered"' + (st.filter === 'unanswered' ? ' selected' : '') + '>Not yet answered correctly here</option>' +
      '</select></label>';
    html += '<label>Order: <select id="pOrder">' +
      '<option value="quiz"' + (st.order === 'quiz' ? ' selected' : '') + '>Quiz order</option>' +
      '<option value="random"' + (st.order === 'random' ? ' selected' : '') + '>Shuffled</option>' +
      '</select></label>';
    html += '<label><input type="checkbox" id="pInstant"' + (st.instant ? ' checked' : '') + '> Show answer immediately</label>';
    html += '<button class="btn sm" id="pGrade">Grade all</button>';
    html += '<button class="btn sm" id="pReset">Reset results for these questions</button>';
    html += '</div>';
    html += '<div class="score" id="pScore"></div>';
    html += '</div><div id="pList"></div>';
    view.innerHTML = html;

    var list = [];
    var session = {}; // qid -> { picked: n | {prompt:answer}, graded: bool, correct: bool }

    function build() {
      var chs = readChecks(view, 'pChs');
      st.chs = chs; saveUi();
      list = QS.filter(function (q) {
        if (chs.indexOf(q.ch) === -1) return false;
        var p = practice[q.id];
        if (st.filter === 'missed') return !!q.missed;
        if (st.filter === 'wrong') return p && p.status === 'wrong';
        if (st.filter === 'unanswered') return !(p && p.status === 'right');
        return true;
      });
      if (st.order === 'random') list = shuffle(list);
      session = {};
      draw();
    }

    function record(q, correct) {
      var p = practice[q.id] || { tries: 0 };
      p.tries += 1; p.status = correct ? 'right' : 'wrong';
      practice[q.id] = p; store.set('es_practice', practice);
    }

    function draw() {
      var out = '';
      if (!list.length) out = '<div class="empty">No questions match this selection.</div>';
      list.forEach(function (q, n) {
        var s = session[q.id] || {};
        var p = practice[q.id];
        out += '<div class="q" id="q-' + q.id + '"><div class="q-head"><span>' + (n + 1) + '.</span><span>' + esc(q.src) + '</span>' +
          '<a href="#guide/' + q.ch + '">' + esc(chShort(q.ch)) + '</a>' +
          (q.missed ? '<span class="chip bad">missed on quiz</span>' : '') +
          (p ? '<span class="chip ' + (p.status === 'right' ? 'good' : 'warn') + '">last time: ' + p.status + '</span>' : '') +
          '</div>';
        out += '<div class="q-text">' + esc(q.q) + '</div>';
        if (q.figure) out += '<div class="q-fig">Figure (described): ' + esc(q.figure) + '</div>';
        if (q.type === 'mc' || q.type === 'tf') {
          out += '<div class="opts">';
          q.options.forEach(function (o, i) {
            var cls = 'opt';
            if (s.graded) {
              if (i === q.answer) cls += ' right';
              else if (i === s.picked) cls += ' wrong';
            } else if (s.picked === i) cls += ' picked';
            out += '<button class="' + cls + '" data-q="' + q.id + '" data-i="' + i + '"' + (s.graded ? ' disabled' : '') + '><span class="letter">' + letter(i) + '.</span><span>' + esc(o) + '</span></button>';
          });
          out += '</div>';
        } else if (q.type === 'match') {
          var pool = q.pairs.map(function (p) { return p.a; }).concat(q.extra || []);
          var seed = q.id.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0);
          pool = pool.slice().sort(function (a, b) { return a.length % 3 - b.length % 3 || (seed % 2 ? a.localeCompare(b) : b.localeCompare(a)); });
          var picks = s.picked || {};
          q.pairs.forEach(function (pr, i) {
            var cls = 'match-row';
            if (s.graded) cls += picks[i] === pr.a ? ' right' : ' wrong';
            out += '<div class="' + cls + '"><div>' + esc(pr.p) + '</div><div><select data-q="' + q.id + '" data-i="' + i + '"' + (s.graded ? ' disabled' : '') + '><option value="">-- choose --</option>';
            pool.forEach(function (a) { out += '<option value="' + esc(a) + '"' + (picks[i] === a ? ' selected' : '') + '>' + esc(a) + '</option>'; });
            out += '</select>' + (s.graded && picks[i] !== pr.a ? '<div class="match-key">Correct: ' + esc(pr.a) + '</div>' : '') + '</div></div>';
          });
          if (!s.graded) out += '<div class="btn-row"><button class="btn sm primary" data-check="' + q.id + '">Check matches</button></div>';
        } else if (q.type === 'essay') {
          out += '<textarea class="essay" data-q="' + q.id + '" placeholder="Write your answer, then reveal the model answer.">' + esc(s.text || '') + '</textarea>';
          if (!s.graded) out += '<div class="btn-row"><button class="btn sm primary" data-reveal="' + q.id + '">Reveal model answer</button></div>';
          else out += '<div class="feedback info"><b>Full-credit answer:</b> ' + esc(q.model) + '<br><br><b>What you wrote on the quiz:</b> ' + esc(q.you) + '<br><br>' + esc(q.explain) +
            '<div class="btn-row"><button class="btn sm" data-self="' + q.id + '" data-v="right">I got the key idea</button><button class="btn sm" data-self="' + q.id + '" data-v="wrong">Need to review</button></div></div>';
        }
        if (s.graded && q.type !== 'essay') {
          out += '<div class="feedback ' + (s.correct ? 'ok' : 'no') + '"><b>' + (s.correct ? 'Correct.' : 'Not quite.') + '</b> ' + esc(q.explain) + '</div>';
        }
        out += '</div>';
      });
      document.getElementById('pList').innerHTML = out;
      drawScore();

      qsa('.opt[data-q]', view).forEach(function (b) {
        b.addEventListener('click', function () {
          var q = QS.filter(function (x) { return x.id === b.dataset.q; })[0];
          var i = parseInt(b.dataset.i, 10);
          session[q.id] = session[q.id] || {};
          session[q.id].picked = i;
          if (st.instant) gradeOne(q);
          draw();
          scrollKeep(q.id);
        });
      });
      qsa('select[data-q]', view).forEach(function (sel) {
        sel.addEventListener('change', function () {
          var id = sel.dataset.q;
          session[id] = session[id] || {};
          session[id].picked = session[id].picked || {};
          session[id].picked[parseInt(sel.dataset.i, 10)] = sel.value;
        });
      });
      qsa('[data-check]', view).forEach(function (b) {
        b.addEventListener('click', function () {
          var q = QS.filter(function (x) { return x.id === b.dataset.check; })[0];
          gradeOne(q); draw(); scrollKeep(q.id);
        });
      });
      qsa('textarea[data-q]', view).forEach(function (t) {
        t.addEventListener('input', function () { session[t.dataset.q] = session[t.dataset.q] || {}; session[t.dataset.q].text = t.value; });
      });
      qsa('[data-reveal]', view).forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.dataset.reveal; session[id] = session[id] || {}; session[id].graded = true; draw(); scrollKeep(id);
        });
      });
      qsa('[data-self]', view).forEach(function (b) {
        b.addEventListener('click', function () {
          var q = QS.filter(function (x) { return x.id === b.dataset.self; })[0];
          record(q, b.dataset.v === 'right'); session[q.id].correct = b.dataset.v === 'right'; draw(); scrollKeep(q.id);
        });
      });
    }

    function scrollKeep(id) {
      var el = document.getElementById('q-' + id);
      if (el) { var r = el.getBoundingClientRect(); if (r.top < 60 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'nearest' }); }
    }

    function gradeOne(q) {
      var s = session[q.id] || {};
      if (s.graded) return;
      if (q.type === 'mc' || q.type === 'tf') {
        if (s.picked === undefined) return;
        s.correct = s.picked === q.answer;
      } else if (q.type === 'match') {
        var picks = s.picked || {};
        s.correct = q.pairs.every(function (p, i) { return picks[i] === p.a; });
        s.picked = picks;
      } else { return; }
      s.graded = true; session[q.id] = s;
      record(q, s.correct);
    }

    function drawScore() {
      var graded = 0, correct = 0, total = list.length;
      list.forEach(function (q) { var s = session[q.id]; if (s && s.graded && q.type !== 'essay') { graded++; if (s.correct) correct++; } });
      var pct = graded ? Math.round(100 * correct / graded) : 0;
      document.getElementById('pScore').innerHTML = '<span>' + total + ' questions | ' + graded + ' graded | ' + correct + ' correct' + (graded ? ' (' + pct + '%)' : '') + '</span>' +
        '<div class="bar"><span style="width:' + (total ? Math.round(100 * correct / total) : 0) + '%"></span></div>';
    }

    qsa('.checks[data-group="pChs"] input', view).forEach(function (i) { i.addEventListener('change', build); });
    qsa('[data-act]', view).forEach(function (b) {
      b.addEventListener('click', function () {
        var on = b.dataset.act === 'all';
        qsa('.checks[data-group="pChs"] input', view).forEach(function (i) { i.checked = on; });
        build();
      });
    });
    document.getElementById('pFilter').addEventListener('change', function () { st.filter = this.value; saveUi(); build(); });
    document.getElementById('pOrder').addEventListener('change', function () { st.order = this.value; saveUi(); build(); });
    document.getElementById('pInstant').addEventListener('change', function () { st.instant = this.checked; saveUi(); });
    document.getElementById('pGrade').addEventListener('click', function () { list.forEach(gradeOne); draw(); });
    document.getElementById('pReset').addEventListener('click', function () {
      list.forEach(function (q) { delete practice[q.id]; });
      store.set('es_practice', practice);
      build();
    });
    build();
  }

  // ---------- MISSED ----------
  function renderMissed() {
    var missed = QS.filter(function (q) { return q.missed; });
    var html = '<div class="panel"><h2>Questions you missed on the quizzes</h2>' +
      '<p class="muted small">' + missed.length + ' items, grouped by chapter, with what you answered, the correct answer, and why. These are the highest-value things to review before the exam.</p>' +
      '<div class="btn-row"><a class="btn primary" href="#practice/missed">Practice only the missed questions</a></div></div>';
    CH.forEach(function (c) {
      var qs = missed.filter(function (q) { return q.ch === c.id; });
      if (!qs.length) return;
      html += '<h3>' + esc(c.title) + '</h3>';
      qs.forEach(function (q) { html += renderMissedCard(q); });
    });
    html += '<h3>Quiz score summary</h3><div class="panel"><table class="tbl"><thead><tr><th>Quiz</th><th>Score</th><th>Missed</th></tr></thead><tbody>' +
      row('Chapter 2 - Intro to Environmental Concepts (8/25)', '19 / 21', 'Q9 population in 2050; Q17 Silent Spring') +
      row('Science, Ch 3 (9/6)', '20 / 21', 'Q6 repetition missing from the scientific method') +
      row('Chap 4+ and Life in the Balance (9/11)', '21 / 21', 'none') +
      row('Chapter 7 Populations and Communities (9/15)', '17.5 / 21', 'Q1 essay (K vs r); Q7 introduced species; Q8 abiotic edge effects; Q19 survivorship figure; Q34 dandelions') +
      row('Evolution (9/23)', '20.41 / 21', 'Q12 sympatric speciation match; Q29 ecological isolation') +
      row('Chapter 6 and 11 Biomes and Biodiversity (10/2)', '14.49 / 17', 'Q1 SSP; Q3 strobilus, carpel, ovule, gametophyte images') +
      row('Conservation, Landscape and Restoration (10/5, late)', '19.5 / 21', 'Q26 lumber (Europe); Q30 paper fiber (South America); Q42 old-growth threat') +
      '</tbody></table></div>';
    view.innerHTML = html;
    function row(a, b, c) { return '<tr><td>' + esc(a) + '</td><td>' + esc(b) + '</td><td>' + esc(c) + '</td></tr>'; }
  }

  // ---------- SEARCH ----------
  function renderSearch(q) {
    q = (q || '').trim();
    document.getElementById('searchBox').value = q;
    var html = '<div class="panel"><h2>Search</h2>';
    if (!q) { html += '<p class="muted">Type a term above and press Enter.</p></div>'; view.innerHTML = html; return; }
    var lq = q.toLowerCase();
    function hl(s) {
      var i = s.toLowerCase().indexOf(lq);
      if (i === -1) return esc(s);
      return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
    }
    function snippet(s) {
      var i = s.toLowerCase().indexOf(lq);
      if (i === -1) return esc(s.slice(0, 160)) + (s.length > 160 ? '...' : '');
      var start = Math.max(0, i - 80), end = Math.min(s.length, i + 120);
      return (start ? '...' : '') + hl(s.slice(start, end)) + (end < s.length ? '...' : '');
    }
    var results = [];
    VOCAB.forEach(function (v) { if ((v.term + ' ' + v.def).toLowerCase().indexOf(lq) !== -1) results.push({ kind: 'Vocab', title: v.term, body: v.def, ch: v.ch, href: '#vocab/' + v.ch }); });
    CONCEPTS.forEach(function (v) { if ((v.term + ' ' + v.def).toLowerCase().indexOf(lq) !== -1) results.push({ kind: 'Concept', title: v.term, body: v.def, ch: v.ch, href: '#concepts/' + v.ch }); });
    CH.forEach(function (c) { c.guide.forEach(function (g) { if ((g.q + ' ' + g.a).toLowerCase().indexOf(lq) !== -1) results.push({ kind: 'Exam guide', title: g.q, body: g.a, ch: c.id, href: '#guide/' + c.id }); }); });
    QS.forEach(function (x) {
      var text = x.q + ' ' + (x.options ? x.options.join(' ') : '') + ' ' + (x.pairs ? x.pairs.map(function (p) { return p.p + ' ' + p.a; }).join(' ') : '') + ' ' + (x.explain || '');
      if (text.toLowerCase().indexOf(lq) !== -1) results.push({ kind: 'Quiz question (' + x.src + ')', title: x.q, body: x.explain || '', ch: x.ch, href: '#practice/' + x.ch });
    });
    html += '<p class="muted small">' + results.length + ' results for "' + esc(q) + '"</p>';
    if (!results.length) html += '<div class="empty">Nothing found.</div>';
    results.forEach(function (r) {
      html += '<div class="result"><div class="kind">' + esc(r.kind) + ' | <a href="' + r.href + '">' + esc(chShort(r.ch)) + '</a></div><div><b>' + hl(r.title) + '</b></div><div class="small">' + snippet(r.body) + '</div></div>';
    });
    html += '</div>';
    view.innerHTML = html;
  }

  // ---------- global wiring ----------
  document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    location.hash = '#search/' + encodeURIComponent(document.getElementById('searchBox').value.trim());
  });
  document.getElementById('resetAll').addEventListener('click', function () {
    if (!confirm('Clear all saved practice results and flashcard marks?')) return;
    practice = {}; cardsState = {}; ui = {};
    store.del('es_practice'); store.del('es_cards'); store.del('es_ui');
    route();
  });

  route();
})();
