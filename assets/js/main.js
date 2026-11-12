/* ==========================================================================
   UNTOLD · interações gerais
   Entrada do hero, revelação no scroll, parallax, menu, cursor, hovers.
   Respeita prefers-reduced-motion.
   ========================================================================== */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var $ = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

    /* ---------- Intro do hero (após as fontes carregarem) ---------- */
    var ready = false;
    function go() { if (ready) return; ready = true; requestAnimationFrame(function () { root.classList.add('is-ready'); }); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 900);

    /* ---------- Revelação no scroll ---------- */
    var revealEls = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce) {
        revealEls.forEach(function (el) { el.classList.add('is-in'); });
    } else {
        // Elementos revelados por clip-path têm área visível zero no início — o
        // IntersectionObserver os ignoraria. Nesses casos observamos o elemento-pai.
        var targets = new Map();
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                (targets.get(en.target) || []).forEach(function (el) { el.classList.add('is-in'); });
                io.unobserve(en.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        revealEls.forEach(function (el) {
            var type = el.getAttribute('data-reveal');
            var t = (type === 'mask' || type === 'photo') ? el.parentElement : el;
            if (!targets.has(t)) targets.set(t, []);
            targets.get(t).push(el);
            io.observe(t);
        });
    }

    /* ---------- Topo: estado, link ativo, voltar ao topo ---------- */
    var topbar = $('#topbar');
    var toTop = $('#back-to-top');
    var navLinks = $$('.topnav a');

    function onScrollState() {
        var y = window.scrollY || window.pageYOffset;
        if (topbar) topbar.classList.toggle('is-top', y < 30);
        if (toTop) toTop.classList.toggle('is-on', y > 900);
    }

    if ('IntersectionObserver' in window && navLinks.length) {
        var map = {};
        navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
        var secIo = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                var a = map[en.target.id];
                if (!a) return;
                if (en.isIntersecting) {
                    navLinks.forEach(function (l) { l.classList.remove('is-active'); });
                    a.classList.add('is-active');
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) secIo.observe(s); });
    }
    if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

    /* ---------- Parallax discreto + selo girando com o scroll ---------- */
    var parallaxEls = reduce ? [] : $$('[data-parallax]');
    var stamp = $('.hero__stamp');
    var ticking = false;

    function frame() {
        ticking = false;
        var vh = window.innerHeight;
        var y = window.scrollY || window.pageYOffset;
        onScrollState();
        if (reduce) return;
        for (var i = 0; i < parallaxEls.length; i++) {
            var el = parallaxEls[i];
            var r = el.getBoundingClientRect();
            if (r.bottom < -200 || r.top > vh + 200) continue;
            var f = parseFloat(el.dataset.parallax) || 0;
            var c = (r.top + r.height / 2 - vh / 2);
            el.style.translate = '0 ' + (c * f).toFixed(1) + 'px';
        }
        if (stamp && y < vh * 1.5) stamp.style.rotate = (y * 0.12).toFixed(1) + 'deg';
    }
    function requestFrame() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener('scroll', requestFrame, { passive: true });
    window.addEventListener('resize', requestFrame);
    frame();

    /* ---------- Menu em tela cheia ---------- */
    var menu = $('#menu');
    var menuBtn = $('#menu-btn');
    var preview = menu && $('.menu__preview img', menu);

    function setMenu(open) {
        if (!menu) return;
        menu.hidden = !open;
        menu.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuBtn.querySelector('.menu-btn__label').textContent = open ? 'Fechar' : 'Menu';
        document.body.classList.toggle('is-locked', open);
        if (open) { var first = $('.menu__nav a', menu); if (first) first.focus({ preventScroll: true }); }
    }
    if (menu && menuBtn) {
        $$('.menu__nav a', menu).forEach(function (a, i) {
            a.style.setProperty('--i', i);
            a.addEventListener('mouseenter', function () { if (preview && a.dataset.img) preview.src = a.dataset.img; });
        });
        menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
        menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
        });
    }

    /* "deck de fita no topo" (seção Spotify) abre o encarte do deck */
    $$('[data-act="open-deck"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (window.UNTOLD_DECK) window.UNTOLD_DECK.openPanel();
        });
    });

    /* ---------- Foto colorida no hover (P&B → cor) ---------- */
    function addColorLayer(host, src) {
        if (!src || host.dataset.colorReady) return;
        host.dataset.colorReady = '1';
        var img = new Image();
        img.className = 'ph__color';
        img.alt = '';
        img.decoding = 'async';
        img.src = src;
        img.setAttribute('aria-hidden', 'true');
        host.appendChild(img);
    }
    if (finePointer) {
        $$('.ph img[data-color]').forEach(function (img) {
            var frameEl = img.parentElement;
            frameEl.addEventListener('pointerenter', function () { addColorLayer(frameEl, img.dataset.color); }, { once: true });
            frameEl.closest('.ph').addEventListener('pointerenter', function () { addColorLayer(frameEl, img.dataset.color); }, { once: true });
        });
        $$('.frame[data-full]').forEach(function (f) {
            f.addEventListener('pointerenter', function () { addColorLayer(f, f.dataset.full); }, { once: true });
        });
    }

    /* ---------- Onde tocamos: foto que segue o cursor ---------- */
    var venueList = $('.venues__list');
    var floatBox = $('.venues__float');
    if (venueList && floatBox && finePointer && !reduce) {
        var floatImg = floatBox.querySelector('img');
        var fx = 0, fy = 0, tx = 0, ty = 0, fRaf = 0, active = false;
        var loop = function () {
            fx += (tx - fx) * 0.14; fy += (ty - fy) * 0.14;
            var rot = Math.max(-8, Math.min(8, (tx - fx) * 0.05));
            floatBox.style.transform = 'translate3d(' + (fx + 28).toFixed(1) + 'px,' + (fy - 120).toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
            if (active || Math.abs(tx - fx) > 0.5) fRaf = requestAnimationFrame(loop); else fRaf = 0;
        };
        $$('.venue', venueList).forEach(function (li) {
            li.addEventListener('mouseenter', function () {
                if (li.dataset.img && floatImg.getAttribute('src') !== li.dataset.img) floatImg.src = li.dataset.img;
            });
        });
        venueList.addEventListener('mouseenter', function (e) {
            fx = tx = e.clientX; fy = ty = e.clientY;
            active = true; floatBox.classList.add('is-on');
            if (!fRaf) fRaf = requestAnimationFrame(loop);
        });
        venueList.addEventListener('mousemove', function (e) {
            tx = e.clientX; ty = e.clientY;
            if (!fRaf) fRaf = requestAnimationFrame(loop);
        });
        venueList.addEventListener('mouseleave', function () { active = false; floatBox.classList.remove('is-on'); });
    }

    /* ---------- Contadores ---------- */
    var counters = $$('[data-count]');
    if (counters.length && 'IntersectionObserver' in window && !reduce) {
        var cio = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                cio.unobserve(en.target);
                var el = en.target, end = parseInt(el.dataset.count, 10), t0 = performance.now(), dur = 1600;
                (function step(now) {
                    var p = Math.min(1, (now - t0) / dur);
                    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
                    if (p < 1) requestAnimationFrame(step);
                })(t0);
            });
        }, { threshold: 0.6 });
        counters.forEach(function (c) { c.textContent = '0'; cio.observe(c); });
    }

    /* ---------- FAQ com abertura suave ---------- */
    $$('.faq__item').forEach(function (d) {
        var sum = $('summary', d), body = $('.faq__a', d);
        if (!sum || !body || reduce || !body.animate) return;
        sum.addEventListener('click', function (e) {
            e.preventDefault();
            if (d.dataset.anim) return;
            d.dataset.anim = '1';
            if (d.open) {
                var h = body.offsetHeight;
                body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.7,0,.2,1)' })
                    .onfinish = function () { d.open = false; delete d.dataset.anim; };
            } else {
                d.open = true;
                var h2 = body.offsetHeight;
                body.animate([{ height: '0px', opacity: 0 }, { height: h2 + 'px', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.2,.75,.1,1)' })
                    .onfinish = function () { delete d.dataset.anim; };
            }
        });
    });

    /* ---------- Cursor personalizado (apenas mouse) ---------- */
    var cursor = $('.cursor');
    if (cursor && finePointer && !reduce) {
        root.classList.add('has-cursor');
        var dot = $('.cursor__dot', cursor), ring = $('.cursor__ring', cursor), label = $('.cursor__label', cursor);
        var mx = -100, my = -100, rx = -100, ry = -100, cRaf = 0;
        var tickCursor = function () {
            rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
            ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
            cRaf = (Math.abs(mx - rx) + Math.abs(my - ry) > 0.2) ? requestAnimationFrame(tickCursor) : 0;
        };
        document.addEventListener('mousemove', function (e) {
            mx = e.clientX; my = e.clientY;
            dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
            cursor.classList.remove('is-hidden');
            if (!cRaf) cRaf = requestAnimationFrame(tickCursor);
        }, { passive: true });
        document.addEventListener('mouseover', function (e) {
            var t = e.target;
            if (t.tagName === 'IFRAME') { cursor.classList.add('is-hidden'); return; }
            var media = t.closest && t.closest('.vid__screen, .frame');
            var link = t.closest && t.closest('a, button, summary, input, label, [role="slider"]');
            cursor.classList.toggle('is-media', !!media);
            cursor.classList.toggle('is-link', !media && !!link);
            label.textContent = media ? (media.classList.contains('frame') ? 'Ver' : 'Play') : '';
        });
        document.documentElement.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
        document.addEventListener('mousedown', function () { cursor.classList.add('is-down'); });
        document.addEventListener('mouseup', function () { cursor.classList.remove('is-down'); });
    }

    /* ---------- Ano no rodapé ---------- */
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
