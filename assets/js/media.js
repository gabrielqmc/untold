/* ==========================================================================
   UNTOLD · mídia
   - Spotify (config/spotify.js) — player oficial incorporado
   - Vídeos do YouTube (data/youtube-latest.js + config/videos.js)
   - Modal compartilhado (vídeo / galeria de fotos)
   ========================================================================== */
(function () {
    'use strict';

    function pauseDeck(reason) {
        window.dispatchEvent(new CustomEvent('untold:pause-deck', { detail: { reason: reason } }));
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* =========================== MODAL =========================== */
    var modal = document.getElementById('modal');
    var stage = modal && modal.querySelector('.modal__stage');
    var caption = modal && modal.querySelector('.modal__caption');
    var lastFocus = null;
    var gallery = [];
    var gIndex = 0;

    function openModal() {
        lastFocus = document.activeElement;
        modal.hidden = false;
        document.body.classList.add('is-locked');
        setTimeout(function () { var c = modal.querySelector('.modal__close'); if (c) c.focus(); }, 30);
    }
    function closeModal() {
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        stage.innerHTML = '';            // remove o iframe: o vídeo para
        stage.classList.remove('is-short');
        modal.classList.remove('is-gallery');
        document.body.classList.remove('is-locked');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function openVideo(id, isShort, title) {
        if (!modal) return;
        pauseDeck('vídeo');
        var src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
            '?autoplay=1&rel=0&playsinline=1&modestbranding=1';
        stage.innerHTML = '<iframe src="' + src + '" title="' + esc(title || 'Vídeo da UNTOLD') + '" ' +
            'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
            'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
        stage.classList.toggle('is-short', !!isShort);
        modal.classList.remove('is-gallery');
        modal.setAttribute('aria-label', title || 'Vídeo');
        caption.textContent = title || '';
        openModal();
    }

    function showPhoto(i) {
        gIndex = (i + gallery.length) % gallery.length;
        var item = gallery[gIndex];
        var img = new Image();
        img.alt = item.alt;
        img.decoding = 'async';
        img.src = item.src;
        stage.innerHTML = '';
        stage.appendChild(img);
        caption.textContent = 'Pose ' + (gIndex + 1) + ' / ' + gallery.length + (item.caption ? ' — ' + item.caption : '');
    }
    function openPhoto(i) {
        if (!modal) return;
        modal.classList.add('is-gallery');
        modal.setAttribute('aria-label', 'Fotos da UNTOLD');
        showPhoto(i);
        openModal();
    }

    if (modal) {
        modal.addEventListener('click', function (e) {
            var a = e.target.closest('[data-act]');
            if (!a) return;
            if (a.dataset.act === 'modal-close') closeModal();
            else if (a.dataset.act === 'modal-prev') showPhoto(gIndex - 1);
            else if (a.dataset.act === 'modal-next') showPhoto(gIndex + 1);
        });
        document.addEventListener('keydown', function (e) {
            if (modal.hidden) return;
            if (e.key === 'Escape') closeModal();
            else if (modal.classList.contains('is-gallery') && e.key === 'ArrowRight') showPhoto(gIndex + 1);
            else if (modal.classList.contains('is-gallery') && e.key === 'ArrowLeft') showPhoto(gIndex - 1);
            else if (e.key === 'Tab') {
                var f = Array.prototype.filter.call(modal.querySelectorAll('button, iframe'), function (el) { return el.offsetParent !== null; });
                if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
        // deslizar para trocar de foto (celular)
        var tx = null;
        modal.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
        modal.addEventListener('touchend', function (e) {
            if (tx === null || !modal.classList.contains('is-gallery')) return;
            var dx = e.changedTouches[0].clientX - tx;
            if (Math.abs(dx) > 50) showPhoto(gIndex + (dx < 0 ? 1 : -1));
            tx = null;
        });
    }

    /* =========================== GALERIA =========================== */
    var frames = Array.prototype.slice.call(document.querySelectorAll('.frame[data-full]'));
    gallery = frames.map(function (f) {
        var img = f.querySelector('img');
        return { src: f.dataset.full, caption: f.dataset.caption || '', alt: img ? img.alt : '' };
    });
    frames.forEach(function (f, i) {
        f.setAttribute('aria-label', 'Ampliar foto: ' + (f.dataset.caption || (i + 1)));
        f.addEventListener('click', function () { openPhoto(i); });
    });

    /* =========================== SPOTIFY =========================== */
    (function spotify() {
        var cfg = window.UNTOLD_SPOTIFY || {};
        var box = document.getElementById('spotify-embed');
        if (!box) return;

        var nameEl = document.querySelector('[data-bind="sp-name"]');
        var descEl = document.querySelector('[data-bind="sp-desc"]');
        if (nameEl && cfg.name) nameEl.textContent = cfg.name;
        if (descEl && cfg.description) descEl.textContent = cfg.description;

        if (cfg.cover) {
            var cover = document.querySelector('[data-bind="sp-cover"]');
            var photo = cover && cover.querySelector('.jewel__photo');
            if (photo) { photo.src = cfg.cover; photo.alt = 'Capa da playlist ' + (cfg.name || ''); cover.classList.add('has-custom'); }
        }

        var parsed = parseSpotify(cfg.url);
        if (!parsed) {
            if (cfg.url) console.warn('[UNTOLD] Link do Spotify não reconhecido em config/spotify.js:', cfg.url);
            return; // mantém o estado "em breve"
        }
        var src = 'https://open.spotify.com/embed/' + parsed.type + '/' + parsed.id + '?utm_source=generator&theme=' + (cfg.theme === 1 ? 1 : 0);
        var openUrl = 'https://open.spotify.com/' + parsed.type + '/' + parsed.id;

        function inject() {
            box.innerHTML =
                '<iframe src="' + src + '" title="Playlist oficial da UNTOLD no Spotify" loading="lazy" ' +
                'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>' +
                '<a class="link-arrow listen__open" href="' + openUrl + '" target="_blank" rel="noopener">Abrir no Spotify ' +
                '<svg aria-hidden="true"><use href="#i-arrow"/></svg></a>';
        }
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) { inject(); io.disconnect(); }
            }, { rootMargin: '600px 0px' });
            io.observe(box);
        } else inject();

        // Ao interagir com o Spotify, o deck do site pausa (evita dois áudios ao mesmo tempo)
        window.addEventListener('blur', function () {
            setTimeout(function () {
                var a = document.activeElement;
                if (a && a.tagName === 'IFRAME' && box.contains(a)) pauseDeck('Spotify');
            }, 0);
        });
    })();

    function parseSpotify(url) {
        if (!url) return null;
        url = String(url).trim();
        var m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|artist|track|show|episode)\/([A-Za-z0-9]+)/i) ||
            url.match(/^spotify:(playlist|album|artist|track|show|episode):([A-Za-z0-9]+)$/i);
        if (m) return { type: m[1].toLowerCase(), id: m[2] };
        if (/^[A-Za-z0-9]{22}$/.test(url)) return { type: 'playlist', id: url };
        return null;
    }

    /* =========================== VÍDEOS =========================== */
    /* "Untold - Pintando Quadros (Ao Vivo no Casarão)"
       → título "Pintando Quadros", local "Ao Vivo no Casarão" */
    function parseTitle(raw) {
        var t = String(raw).trim();
        var venue = '';
        t = t.replace(/^(banda\s+)?untold\s*[-–—|:]\s*/i, '');
        var m = t.match(/\s*[(\[]((?:ao vivo|live|ac[uú]stico)[^)\]]*)[)\]]\s*$/i);
        if (m) { venue = m[1].trim(); t = t.slice(0, m.index).trim(); }
        var parts = t.split(/\s+[-–—|]\s+/);
        return { title: parts[0] || t, artist: parts.length > 1 ? parts.slice(1).join(' · ') : '', venue: venue };
    }
    (function videos() {
        var host = document.getElementById('video-list');
        if (!host) return;
        var cfg = window.UNTOLD_VIDEOS || {};
        var data = window.UNTOLD_YT_LATEST || {};
        var overrides = cfg.overrides || {};
        var limit = cfg.limit || 3;
        var list = (Array.isArray(data.videos) ? data.videos : []).filter(function (v) { return v && v.id; }).slice(0, limit);

        var chan = document.querySelector('[data-bind="yt-channel"]');
        if (chan && cfg.channelUrl) chan.href = cfg.channelUrl;
        if (!list.length) return; // mantém o fallback do HTML

        var dateFmt;
        try { dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) {}

        host.innerHTML = list.map(function (v, i) {
            var o = overrides[v.id] || {};
            var parsed = parseTitle(v.title || '');
            var title = o.title || parsed.title;
            var artist = o.artist || parsed.artist;
            var thumbRemote = 'https://i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/hqdefault.jpg';
            var thumb = o.thumb || thumbRemote;
            var thumbBw = o.thumbBw || thumb;
            var remote = !o.thumbBw;
            var short = v.short !== false;
            var watch = short ? 'https://www.youtube.com/shorts/' + v.id : 'https://www.youtube.com/watch?v=' + v.id;
            var date = '';
            var dateLcd = 'AO VIVO';
            if (v.published) {
                var d = new Date(v.published);
                if (!isNaN(d)) {
                    date = dateFmt ? dateFmt.format(d).replace(/\./g, '') : d.toLocaleDateString('pt-BR');
                    dateLcd = ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
                }
            }
            var venue = [o.venue || parsed.venue, date].filter(Boolean).join(' · ');
            var n = ('0' + (i + 1)).slice(-2);
            var label = 'Assistir: ' + title + (artist ? ' — ' + artist : '');
            return '' +
                '<article class="vid' + (remote ? ' vid--remote' : '') + '" data-reveal style="--d:' + (i * 0.1) + 's">' +
                    '<button class="vid__screen" type="button" data-video="' + esc(v.id) + '" data-short="' + (short ? 1 : 0) + '" data-title="' + esc(title + (artist ? ' — ' + artist : '')) + '" aria-label="' + esc(label) + '">' +
                        '<img class="vid__bw" src="' + esc(thumbBw) + '" alt="" loading="lazy" decoding="async" width="600" height="397">' +
                        '<img class="vid__color" src="' + esc(thumb) + '" alt="" loading="lazy" decoding="async" width="600" height="397">' +
                        '<span class="vid__scan" aria-hidden="true"></span>' +
                        '<span class="vid__osd" aria-hidden="true"><span>PLAY ▶</span><span>CH ' + n + '</span></span>' +
                        '<span class="vid__osd vid__osd-bot" aria-hidden="true"><span>SP</span><span>' + esc(dateLcd) + '</span></span>' +
                        '<span class="vid__play" aria-hidden="true"><svg><use href="#i-play"/></svg></span>' +
                    '</button>' +
                    '<div class="vid__meta">' +
                        '<span class="vid__n" aria-hidden="true">' + n + '</span>' +
                        '<h3 class="vid__title">' + esc(title) + '</h3>' +
                        (artist ? '<p class="vid__artist">' + esc(artist) + '</p>' : '') +
                        (venue ? '<p class="vid__venue mono">' + esc(venue) + '</p>' : '') +
                        '<a class="vid__yt mono" href="' + watch + '" target="_blank" rel="noopener">Abrir no YouTube ↗</a>' +
                    '</div>' +
                '</article>';
        }).join('');

        // Miniatura indisponível → tenta a padrão do YouTube → por fim, uma foto da banda
        var localFallback = ['assets/img/bw/foto-1.webp', 'assets/img/bw/capa-1.webp', 'assets/img/bw/foto-2.webp'];
        host.querySelectorAll('.vid__color, .vid__bw').forEach(function (img, n) {
            img.addEventListener('error', function () {
                var id = img.closest('.vid__screen').dataset.video;
                var yt = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
                var step = +(img.dataset.fallback || 0);
                img.dataset.fallback = step + 1;
                if (step === 0 && img.src !== yt) img.src = yt;
                else if (step <= 1) img.src = localFallback[Math.floor(n / 2) % localFallback.length];
            });
        });

        host.addEventListener('click', function (e) {
            var b = e.target.closest('.vid__screen');
            if (!b) return;
            openVideo(b.dataset.video, b.dataset.short === '1', b.dataset.title);
        });
    })();

    window.UNTOLD_MEDIA = { openVideo: openVideo, openPhoto: openPhoto, closeModal: closeModal, parseSpotify: parseSpotify };
})();
