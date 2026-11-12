/* ==========================================================================
   UNTOLD · DECK DE FITA — player de áudio local (HTMLAudioElement)
   As faixas vêm de config/playlist.js (window.UNTOLD_PLAYLIST).
   Nunca inicia sozinho: a reprodução só começa com um clique do visitante.
   ========================================================================== */
(function () {
    'use strict';

    var deck = document.getElementById('deck');
    if (!deck) return;

    var cfg = window.UNTOLD_PLAYLIST || {};
    var tracks = (Array.isArray(cfg.tracks) ? cfg.tracks : [])
        .filter(function (t) { return t && t.src && t.title; })
        .map(function (t) {
            return { src: String(t.src), title: String(t.title), artist: t.artist ? String(t.artist) : 'UNTOLD', info: t.info ? String(t.info) : '' };
        });

    var store = {
        get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
    };

    var audio = new Audio();
    audio.preload = 'metadata';

    var index = 0;
    var wantPlay = false;          // o visitante pediu para tocar
    var broken = {};               // faixas com erro
    var skipTimer = null;
    var graph = null;              // Web Audio (ganho + analisador), criado no primeiro play
    var vuRaf = 0;
    var panelOpen = false;
    var loop = cfg.loop !== false;

    var savedVol = parseFloat(store.get('untold.volume'));
    var volume = (savedVol >= 0 && savedVol <= 1) ? savedVol : (typeof cfg.defaultVolume === 'number' ? cfg.defaultVolume : 0.8);
    var savedIdx = parseInt(store.get('untold.track'), 10);
    if (savedIdx >= 0 && savedIdx < tracks.length) index = savedIdx;

    /* ---------- helpers ---------- */
    function all(sel) { return Array.prototype.slice.call(deck.querySelectorAll(sel)); }
    function bound(name) { return all('[data-bind="' + name + '"]'); }
    function setText(name, text) { bound(name).forEach(function (el) { el.textContent = text; }); }
    function fmt(sec) {
        if (!isFinite(sec) || sec < 0) return '--:--';
        var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function current() { return tracks[index]; }

    function setState(state) {
        deck.dataset.state = state;
        var playing = state === 'playing';
        all('[data-act="toggle"]').forEach(function (b) {
            b.setAttribute('aria-label', playing ? 'Pausar' : 'Tocar');
            b.setAttribute('aria-pressed', playing ? 'true' : 'false');
        });
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch (e) {}
        }
        if (playing) startVu(); else stopVu();
    }

    /* Letreiro do LCD: rola só se o texto não couber */
    function fitLcd() {
        var wrap = deck.querySelector('.lcd__marquee');
        var text = deck.querySelector('.lcd__text');
        if (!wrap || !text) return;
        text.classList.remove('is-scrolling');
        var dist = text.scrollWidth - wrap.clientWidth;
        if (dist > 4) {
            text.style.setProperty('--lcd-dist', (dist + 12) + 'px');
            text.style.setProperty('--lcd-dur', Math.max(6, (dist + 12) / 18 + 3) + 's');
            text.classList.add('is-scrolling');
        }
    }

    function lcdMessage(msg) {
        setText('title', msg);
        requestAnimationFrame(fitLcd);
    }

    function showTrackInfo() {
        var t = current();
        if (!t) return;
        lcdMessage(t.title + ' · ' + t.artist);
        setText('index', pad(index + 1) + '/' + pad(tracks.length));
        setText('info', [t.artist, t.info].filter(Boolean).join(' — '));
        all('.jcard__now-title').forEach(function (el) { el.textContent = t.title; });
    }

    function setRangePct(input) {
        var min = parseFloat(input.min) || 0, max = parseFloat(input.max) || 1;
        input.style.setProperty('--pct', ((parseFloat(input.value) - min) / (max - min) * 100) + '%');
    }

    /* ---------- lista de faixas ---------- */
    function renderList() {
        var list = deck.querySelector('[data-bind="list"]');
        var empty = deck.querySelector('[data-bind="empty"]');
        if (!list) return;
        list.innerHTML = '';
        if (empty) empty.hidden = tracks.length > 0;
        tracks.forEach(function (t, i) {
            var li = document.createElement('li');
            var b = document.createElement('button');
            b.type = 'button';
            b.dataset.index = i;
            b.innerHTML = '<span class="trk__n"></span><span class="trk__t"></span><span class="trk__d">--:--</span>';
            b.querySelector('.trk__n').textContent = pad(i + 1);
            var tt = b.querySelector('.trk__t');
            tt.textContent = t.title;
            var a = document.createElement('span');
            a.className = 'trk__a';
            a.textContent = [t.artist, t.info].filter(Boolean).join(' — ');
            tt.appendChild(a);
            b.setAttribute('aria-label', 'Tocar ' + t.title + ' — ' + t.artist);
            li.appendChild(b);
            list.appendChild(li);
        });
        markCurrent();
        probeDurations();
    }

    function markCurrent() {
        all('.jcard__list li').forEach(function (li, i) {
            li.classList.toggle('is-current', i === index);
            li.classList.toggle('is-broken', !!broken[i]);
            var b = li.querySelector('button');
            if (b) b.setAttribute('aria-current', i === index ? 'true' : 'false');
        });
    }

    /* Lê a duração das faixas só quando a lista é aberta (economiza dados) */
    var probed = false;
    function probeDurations() {
        if (!panelOpen || probed) return;
        probed = true;
        tracks.forEach(function (t, i) {
            var a = new Audio();
            a.preload = 'metadata';
            a.addEventListener('loadedmetadata', function () {
                var d = deck.querySelectorAll('.jcard__list li .trk__d')[i];
                if (d) d.textContent = fmt(a.duration);
                a.removeAttribute('src');
            });
            a.addEventListener('error', function () {
                broken[i] = true; markCurrent();
                var d = deck.querySelectorAll('.jcard__list li .trk__d')[i];
                if (d) d.textContent = 'erro';
            });
            a.src = t.src;
        });
    }

    /* ---------- Web Audio: volume (funciona no iOS) + VU real ---------- */
    function sameOriginTracks() {
        if (!/^https?:$/.test(location.protocol)) return false; // file:// silenciaria o áudio
        return tracks.every(function (t) {
            try { return new URL(t.src, location.href).origin === location.origin; } catch (e) { return false; }
        });
    }

    function initGraph() {
        if (graph !== null) return;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC || !sameOriginTracks()) { graph = false; deck.classList.add('no-analyser'); return; }
        try {
            var ctx = new AC();
            var src = ctx.createMediaElementSource(audio);
            var gain = ctx.createGain();
            var analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.7;
            src.connect(gain); gain.connect(analyser); analyser.connect(ctx.destination);
            graph = { ctx: ctx, gain: gain, analyser: analyser, data: new Uint8Array(analyser.frequencyBinCount) };
            audio.volume = 1;
            applyVolume();
        } catch (e) {
            graph = false;
            deck.classList.add('no-analyser');
        }
    }

    var vuBars = all('.lcd__vu i');
    function startVu() {
        if (!graph || vuRaf) return;
        var bins = [1, 2, 3, 5, 7, 10, 14];
        (function tick() {
            graph.analyser.getByteFrequencyData(graph.data);
            for (var i = 0; i < vuBars.length; i++) {
                vuBars[i].style.setProperty('--v', (graph.data[bins[i]] || 0) / 255);
            }
            vuRaf = requestAnimationFrame(tick);
        })();
    }
    function stopVu() {
        if (vuRaf) cancelAnimationFrame(vuRaf);
        vuRaf = 0;
        vuBars.forEach(function (b) { b.style.setProperty('--v', 0); });
    }

    function applyVolume() {
        if (graph) { graph.gain.gain.value = volume; audio.volume = 1; }
        else audio.volume = volume;
        bound('volume').forEach(function (input) {
            input.value = volume;
            setRangePct(input);
        });
    }

    /* ---------- transporte ---------- */
    function load(i) {
        if (!tracks.length) return;
        index = (i + tracks.length) % tracks.length;
        clearTimeout(skipTimer);
        audio.src = tracks[index].src;
        store.set('untold.track', String(index));
        showTrackInfo();
        markCurrent();
        updateProgress();
        updateMediaSession();
    }

    function play() {
        if (!tracks.length) { openPanel(); return; }
        wantPlay = true;
        if (!audio.src) load(index);
        initGraph();
        if (graph && graph.ctx.state === 'suspended') graph.ctx.resume();
        if (broken[index]) { lcdMessage('Faixa indisponível'); return; }
        setState('loading');
        var p = audio.play();
        if (p && p.catch) {
            p.catch(function (err) {
                if (err && err.name === 'AbortError') return; // troca de faixa no meio do carregamento
                wantPlay = false;
                setState('paused');
                if (err && err.name === 'NotAllowedError') lcdMessage('Aperte play ▶');
            });
        }
    }

    function pause(reason) {
        wantPlay = false;
        audio.pause();
        if (reason) lcdMessage('Pausado · ' + reason);
    }

    function toggle() { if (audio.paused || !wantPlay) play(); else pause(); }

    function next(auto) {
        if (!tracks.length) return;
        if (auto && !loop && index === tracks.length - 1) {
            wantPlay = false; load(0); setState('paused'); return;
        }
        var keep = wantPlay;
        load(index + 1);
        if (keep) play();
    }

    function prev() {
        if (!tracks.length) return;
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }
        var keep = wantPlay;
        load(index - 1);
        if (keep) play();
    }

    function select(i) {
        load(i);
        play();
    }

    /* ---------- progresso ---------- */
    function updateProgress() {
        var d = audio.duration, t = audio.currentTime || 0;
        var pct = (isFinite(d) && d > 0) ? t / d : 0;
        bound('fill').forEach(function (el) { el.style.transform = 'scaleX(' + pct + ')'; });
        setText('time', isFinite(d) && d > 0 ? fmt(t) : (tracks.length ? '0:00' : '--:--'));
        setText('current', fmt(t));
        setText('duration', fmt(d));
        bound('seek').forEach(function (input) {
            if (document.activeElement !== input) input.value = Math.round(pct * 1000);
            setRangePct(input);
        });
    }

    /* ---------- eventos do áudio ---------- */
    audio.addEventListener('playing', function () { setState('playing'); showTrackInfo(); });
    audio.addEventListener('pause', function () { if (deck.dataset.state !== 'error') setState('paused'); });
    audio.addEventListener('waiting', function () { if (wantPlay) setState('loading'); });
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('durationchange', updateProgress);
    audio.addEventListener('loadedmetadata', function () {
        updateProgress();
        var d = deck.querySelectorAll('.jcard__list li .trk__d')[index];
        if (d) d.textContent = fmt(audio.duration);
    });
    audio.addEventListener('ended', function () { next(true); });
    audio.addEventListener('error', function () {
        if (!audio.getAttribute('src')) return;
        broken[index] = true;
        markCurrent();
        setState('error');
        lcdMessage('Erro · faixa indisponível');
        var working = tracks.filter(function (_, i) { return !broken[i]; }).length;
        if (wantPlay && working > 0) {
            skipTimer = setTimeout(function () { next(false); }, 1600);
        } else {
            wantPlay = false;
            skipTimer = setTimeout(function () { setState('paused'); }, 1600);
        }
    });

    /* ---------- painel (encarte) ---------- */
    var panel = document.getElementById('deck-panel');
    function openPanel() {
        if (!panel) return;
        panelOpen = true;
        panel.hidden = false;
        panel.classList.add('is-open');
        all('[data-act="panel"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
        probeDurations();
    }
    function closePanel() {
        if (!panel || !panelOpen) return;
        panelOpen = false;
        panel.hidden = true;
        panel.classList.remove('is-open');
        all('[data-act="panel"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    }

    deck.addEventListener('click', function (e) {
        var trk = e.target.closest('.jcard__list button');
        if (trk) { select(parseInt(trk.dataset.index, 10)); return; }
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var act = btn.dataset.act;
        if (act === 'toggle') toggle();
        else if (act === 'next') next(false);
        else if (act === 'prev') prev();
        else if (act === 'panel') { panelOpen ? closePanel() : openPanel(); }
        else if (act === 'close-panel') closePanel();
    });

    document.addEventListener('click', function (e) {
        if (panelOpen && !deck.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && panelOpen) {
            closePanel();
            var b = deck.querySelector('.key--list');
            if (b && getComputedStyle(b).display !== 'none') b.focus();
        }
    });

    bound('volume').forEach(function (input) {
        input.addEventListener('input', function () {
            volume = Math.min(1, Math.max(0, parseFloat(input.value)));
            applyVolume();
            store.set('untold.volume', String(volume));
        });
    });
    bound('seek').forEach(function (input) {
        input.addEventListener('input', function () {
            setRangePct(input);
            if (isFinite(audio.duration)) audio.currentTime = (parseFloat(input.value) / 1000) * audio.duration;
        });
    });

    /* ---------- Media Session (tela de bloqueio / fones) ---------- */
    function updateMediaSession() {
        if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
        var t = current();
        if (!t) return;
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: t.title,
                artist: t.artist,
                album: t.info || (cfg.label || 'UNTOLD'),
                artwork: [{ src: 'assets/img/logo-u.png', sizes: '256x256', type: 'image/png' }]
            });
        } catch (e) {}
    }
    if ('mediaSession' in navigator && tracks.length) {
        var ms = navigator.mediaSession;
        try {
            ms.setActionHandler('play', play);
            ms.setActionHandler('pause', function () { pause(); });
            ms.setActionHandler('previoustrack', prev);
            ms.setActionHandler('nexttrack', function () { next(false); });
        } catch (e) {}
    }

    /* Outras fontes de áudio (vídeo do YouTube, Spotify) pedem pausa educada */
    window.addEventListener('untold:pause-deck', function (e) {
        if (wantPlay) pause(e.detail && e.detail.reason);
    });

    /* ---------- inicialização ---------- */
    setText('label', cfg.label || 'UNTOLD · LADO A');
    renderList();
    applyVolume();

    if (!tracks.length) {
        setState('empty');
        lcdMessage('Sem fita · ouça no Spotify ↓');
        setText('index', '00/00');
        setText('time', '--:--');
        all('[data-act="prev"], [data-act="next"]').forEach(function (b) { b.disabled = true; });
        all('[data-act="toggle"]').forEach(function (b) { b.setAttribute('aria-label', 'Sem faixas — ver opções'); });
    } else {
        setState('paused');
        load(index);
        if (tracks.length < 2) all('[data-act="prev"], [data-act="next"]').forEach(function (b) { b.disabled = true; });
    }

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLcd);
    window.addEventListener('resize', function () { requestAnimationFrame(fitLcd); });

    window.UNTOLD_DECK = { play: play, pause: pause, toggle: toggle, next: next, prev: prev, openPanel: openPanel, closePanel: closePanel, tracks: tracks };
})();
