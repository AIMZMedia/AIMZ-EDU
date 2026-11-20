/* =========================================================
   AIMZ EDU — 공용 동작 (2026 리디자인)
   · GSAP + ScrollTrigger + Lenis(부드러운 스크롤)로 스크롤 연출
   · 메뉴를 눌러도 주소창은 도메인만 — <main>만 갈아 끼운다 (기존 방식 유지)
   · 스크립트가 막히거나 '움직임 줄이기'면 모든 내용이 그대로 보인다
   페이지 HTML 은 data-* 속성만 달면 된다. 쓸 수 있는 속성은 아래 '부품' 목록.
   ========================================================= */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger) && !reduce;
  if (reduce) root.classList.add('reduce');
  if (!hasGsap) root.classList.add('reduce'); /* 라이브러리를 못 받으면 숨김 상태를 풀어 둔다 (밑줄도 바로 보인다) */
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- 부드러운 스크롤 ---------------- */
  let lenis = null;
  if (hasGsap && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y, immediate) => lenis ? lenis.scrollTo(y, { immediate: !!immediate, offset: 0 }) : scrollTo({ top: y, behavior: immediate || reduce ? 'auto' : 'smooth' });
  const scrollToEl = (el, immediate) => {
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - (parseInt(getComputedStyle(root).getPropertyValue('--hdr-h')) || 72) - 8;
    scrollToY(y, immediate);
  };

  /* ---------------- 머리말 · 진행 막대 · 맨 위로 ---------------- */
  const hdr = $('.hdr');
  const bar = document.createElement('div'); bar.className = 'progress'; document.body.appendChild(bar);
  const top = document.createElement('button');
  top.type = 'button'; top.className = 'totop'; top.setAttribute('aria-label', '맨 위로'); top.textContent = '↑';
  document.body.appendChild(top);
  top.addEventListener('click', () => scrollToY(0));
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY, max = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    top.classList.toggle('on', y > innerHeight * 1.2);
    if (!hdr) return;
    hdr.classList.toggle('solid', y > 10);
    /* 아래로 빠르게 내릴 때는 숨기고, 올리면 다시 */
    const nav = $('#nav');
    if (!(nav && nav.classList.contains('open'))) hdr.classList.toggle('hide', y > 640 && y > lastY + 2);
    if (y < lastY - 2 || y < 640) hdr.classList.remove('hide');
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* 떠 있는 상담 카드 — 첫 화면을 지나면 나타난다. 닫으면 이번 방문 동안 다시 안 뜬다 */
  const fl = document.createElement('aside');
  fl.className = 'fl'; fl.setAttribute('aria-label', '교육 상담');
  fl.innerHTML = '<a href="/contact"><span class="fl-ph"><img src="/assets/img/instructor-lee_v3.jpg" alt=""></span><p>교육 문의<small>담당자가 직접 답합니다</small></p></a><button class="fl-x" type="button" aria-label="상담 버튼 닫기">×</button>';
  let flOff = false; try { flOff = sessionStorage.getItem('edu-fl-off') === '1'; } catch (e) {}
  if (!flOff) document.body.appendChild(fl);
  $('.fl-x', fl).addEventListener('click', () => { fl.remove(); flOff = true; try { sessionStorage.setItem('edu-fl-off', '1'); } catch (e) {} });
  function syncFl() { if (!flOff) fl.classList.toggle('on', scrollY > innerHeight * .7 && current !== '/contact'); }
  addEventListener('scroll', () => syncFl(), { passive: true });

  /* 모바일 메뉴 */
  const burger = $('.burger'), nav = $('#nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      hdr.classList.remove('hide');
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });
  }

  /* ---------------- 부품들 ---------------- */
  let ctx = null, cleanups = [];

  /* data-split : <br> 로 나눈 줄을 하나씩 밀어 올린다 */
  function splitLines(el) {
    if (el.dataset.splitDone) return $$('.line>span', el);
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(p => `<span class="line"><span>${p.trim()}</span></span>`).join('');
    el.dataset.splitDone = '1';
    return $$('.line>span', el);
  }

  function countUp(el) {
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    const fmt = v => v.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (!hasGsap) { el.textContent = fmt(end); return; }
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  }

  function initTabs(scope) {
    $$('.tabs', scope).forEach(group => {
      const tabs = $$('.tab', group);
      const act = t => tabs.forEach(x => {
        const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
        const p = document.getElementById(x.dataset.panel); if (p) p.classList.toggle('on', on);
      });
      tabs.forEach((t, i) => {
        t.setAttribute('role', 'tab'); t.addEventListener('click', () => { act(t); hasGsap && ScrollTrigger.refresh(); });
        t.addEventListener('keydown', e => {
          const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (d) { e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); act(n); }
        });
      });
      group.setAttribute('role', 'tablist');
    });
  }
  function openPanel(id) {
    const t = id && $(`.tab[data-panel="${CSS.escape(id)}"]`);
    if (!t) return false;
    t.click(); scrollToEl(t.closest('.tabs'));
    return true;
  }

  function initMarquee(scope) {
    $$('.marquee', scope).forEach(m => {
      const tr = $('.marquee-track', m);
      if (!tr || tr.dataset.dup) return;
      const base = tr.innerHTML; let k = 0;
      while (tr.scrollWidth < Math.max(m.offsetWidth, innerWidth) + 40 && k++ < 12) tr.innerHTML += base;
      const dur = parseFloat(getComputedStyle(m).getPropertyValue('--mq-dur')) || 40;
      m.style.setProperty('--mq-dur', dur * (k + 1) + 's'); /* 채운 만큼 시간도 늘려 속도를 같게 */
      tr.innerHTML += tr.innerHTML; tr.dataset.dup = '1';
      $$('[aria-hidden]', tr).length || [...tr.children].slice(tr.children.length / 2).forEach(c => c.setAttribute('aria-hidden', 'true'));
    });
  }

  function initForms(scope) {
    $$('form[data-mailto]', scope).forEach(form => {
      const sel = $('select[name="type"]', form);
      const want = new URLSearchParams(pendingSearch || location.search).get('interest');
      if (sel && want && [...sel.options].some(o => o.value === want)) sel.value = want;
      form.addEventListener('submit', e => {
        e.preventDefault();
        const d = new FormData(form);
        const type = sel ? sel.options[sel.selectedIndex].text : '';
        const subject = `[${form.dataset.brand || 'AIMZ EDU'} 문의] ${d.get('org') || ''} · ${type}`;
        const body = `기관·회사명: ${d.get('org') || ''}\n담당자: ${d.get('name') || ''}\n연락처: ${d.get('tel') || ''}\n예상 인원: ${d.get('size') || ''}\n관심 분야: ${type}\n\n${d.get('msg') || ''}`;
        location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      });
    });
  }

  /* 마우스 자리 빛 · 기울기 */
  function initPointer(scope) {
    if (!fine) return;
    $$('[data-glow],[data-tilt]', scope).forEach(el => {
      const tilt = el.hasAttribute('data-tilt'), amt = parseFloat(el.dataset.tilt) || 6;
      const move = e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
        if (tilt && hasGsap) gsap.to(el, { rotateX: (.5 - y) * amt, rotateY: (x - .5) * amt * 1.3, transformPerspective: 900, duration: .5, ease: 'power2.out' });
      };
      const leave = () => tilt && hasGsap && gsap.to(el, { rotateX: 0, rotateY: 0, duration: .8, ease: 'power3.out' });
      el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
      cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
    });
    /* data-float="깊이" : 마우스를 따라 조금씩 떠다닌다 (홈 첫 화면 사진) */
    const floats = $$('[data-float]', scope);
    if (floats.length && hasGsap) {
      const mv = e => {
        const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
        floats.forEach(f => { const d = parseFloat(f.dataset.float) || 1; gsap.to(f, { x: nx * 30 * d, y: ny * 22 * d, duration: 1.2, ease: 'power3.out', overwrite: 'auto' }); });
      };
      addEventListener('pointermove', mv, { passive: true });
      cleanups.push(() => removeEventListener('pointermove', mv));
    }
  }

  /* ---------------- 스크롤 연출 ---------------- */
  function initMotion(scope) {
    if (!hasGsap) return;
    const mm = gsap.matchMedia();

    /* 화면을 붙잡는(pin) 구획부터 만든다 — 그래야 그 아래 트리거 위치가 맞는다 */
    /* data-switch : 화면을 붙잡은 채 목록이 차례로 켜진다 (조코딩AX 방식). data-dark-from="2" 이면 3번째부터 배경이 어두워진다 */
    mm.add('(min-width: 901px)', () => {
      $$('[data-switch]', scope).forEach(sec => {
        const items = $$('.sw-item', sec), media = $$('.sw-media > *', sec), caps = $$('.sw-cap > *', sec), bars = $$('.sw-bar i', sec);
        const n = items.length, darkFrom = sec.dataset.darkFrom ? +sec.dataset.darkFrom : -1;
        let cur = -1;
        const act = i => {
          if (i === cur) return; cur = i;
          items.forEach((it, k) => it.classList.toggle('on', k === i));
          media.forEach((m, k) => m.classList.toggle('on', k === i));
          caps.forEach((c, k) => c.classList.toggle('on', k === i));
          sec.classList.toggle('is-dark', darkFrom >= 0 && i >= darkFrom);
        };
        act(0);
        const st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: () => '+=' + Math.round(n * innerHeight * .6), pin: true, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: s => {
            const p = s.progress * n, i = Math.min(n - 1, Math.floor(p));
            act(i);
            bars.forEach((b, k) => { b.style.transform = `scaleX(${k < i ? 1 : k === i ? Math.min(1, p - i) : 0})`; });
          } });
        items.forEach((it, i) => it.addEventListener('click', e => {
          if (e.target.closest('a')) return;
          scrollToY(st.start + (st.end - st.start) * ((i + .5) / n));
        }));
      });
    });
    /* data-hscroll : 세로로 내리면 가로로 흘러간다 (넓은 화면만) */
    mm.add('(min-width: 901px)', () => {
      $$('[data-hscroll]', scope).forEach(sec => {
        const track = $('.h-track', sec); if (!track) return;
        const dist = () => Math.max(0, track.scrollWidth - innerWidth + parseFloat(getComputedStyle(track).paddingLeft || 0));
        gsap.to(track, { x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1 } });
        const prog = $('.h-progress i', sec);
        if (prog) gsap.fromTo(prog, { scaleX: 0 }, { scaleX: 1, ease: 'none', transformOrigin: '0 50%',
          scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), scrub: true } });
      });
    });

    /* data-expand : 큰 글자 사이 사진이 화면 가득 커진다 (홈) */
    mm.add('(min-width: 0px)', () => {
      $$('[data-expand]', scope).forEach(sec => {
        const media = $('.ex-media', sec), l = $('.ex-l', sec), r = $('.ex-r', sec), over = $('.ex-over', sec);
        if (!media) return;
        const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=180%', pin: true, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true } });
        tl.to(media, { width: () => root.clientWidth, height: () => innerHeight, borderRadius: 0, ease: 'power2.inOut', duration: 1 }, 0)
          .to(l, { xPercent: -120, opacity: 0, ease: 'power2.in', duration: .7 }, 0)
          .to(r, { xPercent: 120, opacity: 0, ease: 'power2.in', duration: .7 }, 0)
          .fromTo($('img', media), { scale: 1.3 }, { scale: 1, ease: 'none', duration: 1 }, 0);
        if (over) tl.fromTo(over, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .35, ease: 'power2.out' }, .78);
      });
    });

    /* data-vhero : 첫 화면 영상 — 내리면 영상은 다가오며 어두워지고 글은 위로 빠진다 */
    $$('[data-vhero]', scope).forEach(h => {
      gsap.timeline({ scrollTrigger: { trigger: h, start: 'top top', end: 'bottom top', scrub: true } })
        .to($('.vh-media', h), { scale: 1.12, filter: 'brightness(.4)', ease: 'none' }, 0)
        .to($('.vh-copy', h), { yPercent: -18, opacity: 0, ease: 'none' }, 0)
        .to($('.vh-foot', h), { opacity: 0, ease: 'none', duration: .4 }, 0);
    });
    /* 첫 화면 제목: 불러오자마자 */
    $$('[data-split="load"]', scope).forEach(el => {
      gsap.from(splitLines(el), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .09, delay: .15 });
    });
    $$('[data-load]', scope).forEach((el, i) => {
      gsap.from(el, { opacity: 0, y: 24, duration: 1, ease: 'expo.out', delay: .45 + i * .08 });
    });
    /* 스크롤로 들어올 때 제목 */
    $$('[data-split]:not([data-split="load"])', scope).forEach(el => {
      gsap.from(splitLines(el), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: .08,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    });
    /* 나타나기 — 같은 부모 안에서 차례로 */
    const groups = new Map();
    $$('[data-reveal]', scope).forEach(el => {
      const k = el.closest('[data-stagger]') || el;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(el);
    });
    groups.forEach((els, trig) => {
      const clip = els.filter(e => e.dataset.reveal === 'clip'), rest = els.filter(e => e.dataset.reveal !== 'clip');
      if (rest.length) gsap.to(rest, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .09,
        scrollTrigger: { trigger: trig, start: 'top 88%', once: true } });
      clip.forEach(c => gsap.to(c, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: c, start: 'top 85%', once: true } }));
    });
    /* 숫자 */
    $$('[data-count]', scope).forEach(countUp);
    /* 포인트 밑줄 */
    $$('.hl', scope).forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 82%', once: true, onEnter: () => el.classList.add('on') }));
    /* data-parallax="0.2" : 스크롤보다 느리게/빠르게 */
    $$('[data-parallax]', scope).forEach(el => {
      const s = parseFloat(el.dataset.parallax) || .15;
      gsap.fromTo(el, { yPercent: -s * 50 }, { yPercent: s * 50, ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    /* data-zoom : 사진이 틀 안에서 천천히 줌 아웃 */
    $$('[data-zoom]', scope).forEach(el => {
      gsap.fromTo(el, { scale: 1.18 }, { scale: 1, ease: 'none',
        scrollTrigger: { trigger: el.closest('.shot') || el, start: 'top bottom', end: 'bottom 40%', scrub: true } });
    });
    /* data-draw : 선이 왼쪽에서 그어진다 */
    $$('[data-draw]', scope).forEach(el => {
      gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0 50%', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 45%', scrub: true } });
    });

    /* data-steps : 왼쪽 글이 지나갈 때마다 오른쪽 사진이 바뀐다 (Runway 방식) */
    $$('[data-steps]', scope).forEach(box => {
      const items = $$('[data-step]', $('.steps-list', box) || box).filter(i => !i.closest('.steps-media'));
      const media = $$('.steps-media [data-step]', box);
      const act = i => {
        items.forEach((it, k) => it.classList.toggle('on', k === i));
        media.forEach((m, k) => m.classList.toggle('on', k === i));
        const c = $('.steps-count', box); if (c) c.textContent = String(i + 1).padStart(2, '0');
      };
      act(0);
      /* 빠르게 오르내려도 맞도록, 바뀔 때마다 '화면 55% 선을 지난 마지막 항목'을 다시 계산한다 */
      const sync = () => {
        const line = innerHeight * .55; let k = 0;
        items.forEach((it, i) => { if (it.getBoundingClientRect().top <= line) k = i; });
        act(k);
      };
      items.forEach(it => ScrollTrigger.create({ trigger: it, start: 'top 55%', end: 'bottom 55%', onToggle: sync }));
    });

    /* data-stack : 카드가 겹쳐 쌓이며 뒤 카드가 작고 어두워진다 (넓은 화면만 — 좁으면 쌓이지 않는다) */
    mm.add('(min-width: 901px)', () => {
      $$('[data-stack]', scope).forEach(box => {
        const cards = $$('.stack-card', box);
        cards.forEach((c, i) => {
          if (i === cards.length - 1) return;
          gsap.to(c, { scale: .92, filter: 'brightness(.45)', ease: 'none',
            scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top ' + (parseInt(getComputedStyle(c).top) || 120) + 'px', scrub: true } });
        });
      });
    });
    cleanups.push(() => mm.revert());
  }

  /* 첫 화면 영상: 정지 버튼, 움직임 줄이기면 처음부터 멈춤, 다른 구획이 다 덮으면 멈춤 */
  function initVideo(scope) {
    $$('[data-vhero]', scope).forEach(h => {
      const v = $('video', h), b = $('.vh-toggle', h); if (!v) return;
      let userPaused = reduce;
      const set = p => { if (b) { b.setAttribute('aria-pressed', p); b.setAttribute('aria-label', p ? '배경 영상 재생' : '배경 영상 일시정지'); b.textContent = p ? '▶' : '❚❚'; } };
      const play = () => { const r = v.play(); r && r.catch(() => {}); };
      if (reduce) { v.removeAttribute('autoplay'); v.pause(); } set(userPaused);
      if (b) b.addEventListener('click', () => { userPaused = !userPaused; userPaused ? v.pause() : play(); set(userPaused); });
      const vis = () => { if (userPaused) return; scrollY > innerHeight * 1.3 ? v.pause() : (v.paused && play()); };
      addEventListener('scroll', vis, { passive: true });
      cleanups.push(() => removeEventListener('scroll', vis));
    });
  }

  /* ---------------- 페이지 시작 · 정리 ---------------- */
  let pendingSearch = '';
  function initPage() {
    const scope = $('main');
    if (hasGsap) ctx = gsap.context(() => initMotion(scope), scope);
    initTabs(scope); initMarquee(scope); initForms(scope); initPointer(scope); initVideo(scope);
    /* 현재 메뉴 표시 */
    const navPath = ALIAS[current] ? ALIAS[current].p : current;
    $$('#nav a').forEach(a => {
      const u = new URL(a.href, location.origin);
      if (u.origin === location.origin && clean(u.pathname) === navPath) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    onScroll(); syncFl();
    if (hasGsap) { requestAnimationFrame(() => ScrollTrigger.refresh()); (document.fonts && document.fonts.ready || Promise.resolve()).then(() => ScrollTrigger.refresh()); }
  }
  function teardown() {
    cleanups.forEach(f => { try { f(); } catch (e) {} }); cleanups = [];
    if (ctx) { ctx.revert(); ctx = null; }
    if (hasGsap) ScrollTrigger.getAll().forEach(t => t.kill());
  }

  /* ---------------- 주소를 바꾸지 않는 페이지 이동 ---------------- */
  const PAGES = new Set(['/', '/courses', '/platform', '/cases', '/instructors', '/contact']);
  /* 옛 주소 → 새 자리 (예전 링크·검색 결과 대비) */
  const ALIAS = { '/safety': { p: '/platform', h: '#safety' }, '/support': { p: '/contact', h: '#support' }, '/labs': { p: '/', h: '#labs' } };
  const clean = p => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p).replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
  let current = clean(location.pathname), busy = false;
  const FIRST_HASH = location.hash; /* 주소창을 '/'로 바꾸기 전에 #부분과 ?부분을 기억해 둔다 */
  pendingSearch = location.search;
  if (current !== '/' && (PAGES.has(current) || ALIAS[current])) history.replaceState({ p: current, s: location.search, h: location.hash }, '', '/');

  function syncHead(doc) {
    /* 페이지 전용 스타일(data-page-css)을 맞춰 끼운다 */
    $$('link[data-page-css]').forEach(l => { if (!doc.querySelector(`link[data-page-css][href="${l.getAttribute('href')}"]`)) l.remove(); });
    doc.querySelectorAll('link[data-page-css]').forEach(l => {
      if (!$(`link[data-page-css][href="${l.getAttribute('href')}"]`)) document.head.appendChild(l.cloneNode());
    });
    const d = doc.querySelector('meta[name="description"]'), m = $('meta[name="description"]');
    if (d && m) m.setAttribute('content', d.getAttribute('content'));
  }

  async function swap(path, search, hash, push) {
    if (busy) return; busy = true;
    if (ALIAS[path]) { hash = hash || ALIAS[path].h; path = ALIAS[path].p; }
    try {
      const res = await fetch(path + (search || ''), { credentials: 'same-origin' });
      if (!res.ok) throw new Error(res.status);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const newMain = doc.querySelector('main'); if (!newMain) throw new Error('main 없음');
      const curMain = $('main');
      if (hasGsap) await gsap.to(curMain, { opacity: 0, y: -12, duration: .28, ease: 'power2.in' });
      teardown();
      document.title = doc.title;
      syncHead(doc);
      curMain.replaceWith(newMain);
      pendingSearch = search || ''; current = path;
      if (push) history.pushState({ p: path, s: search || '', h: hash || '' }, '', location.href);
      scrollToY(0, true);
      initPage();
      if (hasGsap) gsap.from(newMain, { opacity: 0, y: 16, duration: .5, ease: 'power2.out', clearProps: 'opacity,transform' });
      if (hash) setTimeout(() => { const id = decodeURIComponent(hash.slice(1)); openPanel(id) || scrollToEl(document.getElementById(id), false); }, 120);
      const nv = $('#nav'); if (nv) nv.classList.remove('open');
    } catch (e) {
      location.href = path + (search || '') + (hash || '');
    }
    busy = false;
  }

  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a'); if (!a) return;
    const raw = a.getAttribute('href') || '';
    if (raw.startsWith('#')) {
      const id = decodeURIComponent(raw.slice(1));
      if (!id) { e.preventDefault(); scrollToY(0); return; }
      if (openPanel(id)) { e.preventDefault(); return; }
      const el = document.getElementById(id); if (el) { e.preventDefault(); scrollToEl(el); }
      return;
    }
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const p = clean(url.pathname);
    if (!PAGES.has(p) && !ALIAS[p]) return;
    e.preventDefault();
    if (p === current && !url.search && url.hash) { const id = decodeURIComponent(url.hash.slice(1)); openPanel(id) || scrollToEl(document.getElementById(id)); return; }
    swap(p, url.search, url.hash, true);
  });
  addEventListener('popstate', e => { const s = e.state; if (s && s.p) swap(s.p, s.s, s.h, false); });

  /* 처음 들어온 주소가 옛 주소(/safety 등)면 새 자리로 */
  if (ALIAS[current]) { swap(current, location.search, FIRST_HASH, false); }
  else {
    initPage();
    if (FIRST_HASH) setTimeout(() => { const id = decodeURIComponent(FIRST_HASH.slice(1)); openPanel(id) || scrollToEl(document.getElementById(id), true); }, 200);
  }
})();
