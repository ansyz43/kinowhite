// Общая логика сайта: мобильное меню, модалка контакта, отправка /api/lead, простые горизонтальные ленты.

// Mega-menu с hover-intent — 350ms grace, чтобы курсор не закрывал панель моментально
(function () {
  const items = document.querySelectorAll('.nav-links > li.has-mega');
  if (!items.length) return;
  const GRACE = 350;
  items.forEach((li) => {
    let t = null;
    const open = () => {
      clearTimeout(t);
      // закрываем остальные открытые
      items.forEach((other) => { if (other !== li) other.classList.remove('is-mega-open'); });
      li.classList.add('is-mega-open');
    };
    const close = () => {
      clearTimeout(t);
      t = setTimeout(() => li.classList.remove('is-mega-open'), GRACE);
    };
    li.addEventListener('mouseenter', open);
    li.addEventListener('mouseleave', close);
    // focus-within для клавиатуры
    li.addEventListener('focusin', open);
    li.addEventListener('focusout', (e) => {
      if (!li.contains(e.relatedTarget)) close();
    });
  });
  // Esc закрывает всё
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') items.forEach((li) => li.classList.remove('is-mega-open'));
  });
})();

// Accordion (мастер-классы на /program) — раскрывает/сворачивает .acc-body
(function () {
  document.querySelectorAll('[data-acc-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('[data-acc]');
      const body = item.querySelector('.acc-body');
      const open = item.hasAttribute('data-acc-open');
      if (open) {
        item.removeAttribute('data-acc-open');
        body.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      } else {
        item.setAttribute('data-acc-open', '');
        body.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();

// Year scrubber (/archive) — клик скроллит к секции года, активный пункт подсвечивается на скролле
(function () {
  const scrubber = document.querySelector('[data-year-scrubber]');
  if (!scrubber) return;
  const btns = Array.from(scrubber.querySelectorAll('.year-scrubber-btn'));
  btns.forEach((b) => {
    b.addEventListener('click', () => {
      const target = document.querySelector(b.dataset.yearTarget);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  const sections = btns.map((b) => document.querySelector(b.dataset.yearTarget)).filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const id = '#' + e.target.id;
        btns.forEach((b) => b.classList.toggle('is-active', b.dataset.yearTarget === id));
      }
    });
  }, { rootMargin: '-30% 0px -50% 0px', threshold: 0 });
  sections.forEach((s) => io.observe(s));
})();

// Multi-step form (/submit) — прев/нэкст переключают шаги, прогресс-бар + label
(function () {
  const form = document.querySelector('[data-multistep]');
  if (!form) return;
  const fieldsets = Array.from(form.querySelectorAll('.msf-fieldset'));
  const steps = Array.from(form.querySelectorAll('.msf-steps li'));
  const prev = form.querySelector('[data-msf-prev]');
  const next = form.querySelector('[data-msf-next]');
  const bar  = form.querySelector('[data-msf-bar]');
  const status = form.querySelector('[data-msf-status]');
  let i = 0;
  const render = () => {
    fieldsets.forEach((f, idx) => { f.hidden = idx !== i; });
    steps.forEach((s, idx) => s.classList.toggle('active', idx <= i));
    if (bar) bar.style.setProperty('--p', (((i + 1) / fieldsets.length) * 100) + '%');
    prev.disabled = i === 0;
    next.textContent = i === fieldsets.length - 1 ? 'Отправить →' : 'Далее →';
    if (status) status.textContent = `Шаг ${i + 1} из ${fieldsets.length}`;
  };
  prev.addEventListener('click', () => { if (i > 0) { i--; render(); } });
  next.addEventListener('click', () => {
    if (i < fieldsets.length - 1) { i++; render(); }
    else {
      // последний шаг — заглушка
      status.textContent = 'Спасибо! Мы свяжемся с вами как только откроется приём заявок.';
      next.disabled = true;
    }
  });
  render();
})();

// Dropzone — drag&drop файлов, показывает список выбранных
(function () {
  document.querySelectorAll('[data-dropzone]').forEach((zone) => {
    const input = zone.querySelector('[data-dropzone-input]');
    const list = zone.querySelector('[data-dropzone-files]');
    if (!input || !list) return;
    const render = (files) => {
      list.innerHTML = '';
      Array.from(files).forEach((f) => {
        const li = document.createElement('li');
        li.textContent = `${f.name} · ${(f.size / 1024 / 1024).toFixed(2)} МБ`;
        list.appendChild(li);
      });
    };
    zone.addEventListener('click', (e) => {
      if (e.target === input) return;
      input.click();
    });
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', () => render(input.files));
    ['dragenter','dragover'].forEach((ev) =>
      zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-drag'); })
    );
    ['dragleave','drop'].forEach((ev) =>
      zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-drag'); })
    );
    zone.addEventListener('drop', (e) => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) {
        input.files = files;
        render(files);
      }
    });
  });
})();

// Sound toggle — переключает иконку, при наличии audio[data-ambient] управляет воспроизведением
(function () {
  const btn = document.querySelector('[data-sound-toggle]');
  if (!btn) return;
  const audio = document.querySelector('audio[data-ambient]');
  const iconOff = btn.querySelector('[data-icon="off"]');
  const iconOn  = btn.querySelector('[data-icon="on"]');
  let on = false;
  btn.addEventListener('click', () => {
    on = !on;
    btn.dataset.on = String(on);
    iconOff.style.display = on ? 'none' : '';
    iconOn.style.display  = on ? '' : 'none';
    if (audio) {
      if (on) audio.play().catch(() => {});
      else audio.pause();
    }
  });
})();

// Text Reveal by word — DOM-walker (не ломает вложенные <span>, <em>, <br>)
(function () {
  const targets = document.querySelectorAll('.hero-title, [data-text-reveal]');
  targets.forEach((el) => {
    if (el.dataset.split === '1') return;
    el.dataset.split = '1';

    // Рекурсивно ходим по текстовым нодам и оборачиваем каждое слово в <span class="word">
    const walk = (node) => {
      const children = Array.from(node.childNodes);
      children.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.nodeValue;
          if (!text || !text.trim()) return;
          const frag = document.createDocumentFragment();
          const parts = text.split(/(\s+)/);
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
            } else {
              const word = document.createElement('span');
              word.className = 'word';
              const inner = document.createElement('span');
              inner.className = 'word-i';
              inner.textContent = part;
              word.appendChild(inner);
              frag.appendChild(word);
            }
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);

    const fire = () => {
      el.querySelectorAll('.word').forEach((w, i) => {
        w.style.transitionDelay = (i * 70) + 'ms';
        requestAnimationFrame(() => w.classList.add('in'));
      });
    };
    if (el.classList.contains('hero-title')) {
      setTimeout(fire, 150);
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { fire(); io.unobserve(e.target); } });
      }, { threshold: 0.4 });
      io.observe(el);
    }
  });
})();

// Cursor trail — отключено по запросу

// Reveal-on-scroll — IntersectionObserver: blur-up + stagger
(function () {
  const targets = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  targets.forEach((el) => io.observe(el));
})();

// Mouse-follow для .nom-card (radial-glow следует за курсором)
(function () {
  document.querySelectorAll('.nom-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
})();

// Animated counter — цифры в .stat-num [data-count] плавно отсчитываются вверх
// до значения в data-count, когда .stats-strip попадает в viewport
(function () {
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function animate(el, target, duration) {
    const start = performance.now();
    const from = 0;
    function step(now) {
      const p = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (target - from) * easeOut(p));
      el.textContent = v;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target; // финальное точное значение
    }
    requestAnimationFrame(step);
  }
  const nums = document.querySelectorAll('.stat-num[data-count]');
  if (!nums.length) return;
  const seen = new WeakSet();
  if (!('IntersectionObserver' in window)) {
    nums.forEach((el) => animate(el, +el.dataset.count, 1500));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !seen.has(entry.target)) {
        seen.add(entry.target);
        const target = parseInt(entry.target.dataset.count, 10);
        const duration = target > 100 ? 2200 : 1500;
        animate(entry.target, target, duration);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  nums.forEach((el) => io.observe(el));
})();

(function () {
  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.querySelector('[data-nav-menu]');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
})();

// Sticky nav — прячется при скролле вниз, появляется при скролле вверх и на hover
(function () {
  const nav = document.querySelector('nav.site-nav, nav');
  if (!nav) return;
  let lastY = window.scrollY;
  let hovered = false;
  const TOP_THRESHOLD = 80;
  const DELTA = 6;

  const update = () => {
    const y = window.scrollY;
    if (y <= TOP_THRESHOLD || hovered) {
      nav.classList.remove('nav-hidden');
      lastY = y; return;
    }
    if (Math.abs(y - lastY) < DELTA) return;
    if (y > lastY) nav.classList.add('nav-hidden');
    else nav.classList.remove('nav-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', update, { passive: true });

  // hover-зона у верхнего края экрана возвращает шапку
  const hoverZone = document.createElement('div');
  hoverZone.style.cssText = 'position:fixed;top:0;left:0;right:0;height:24px;z-index:199;pointer-events:auto';
  hoverZone.addEventListener('mouseenter', () => { hovered = true; nav.classList.remove('nav-hidden'); });
  hoverZone.addEventListener('mouseleave', () => { hovered = false; });
  nav.addEventListener('mouseenter', () => { hovered = true; });
  nav.addEventListener('mouseleave', () => { hovered = false; });
  document.body.appendChild(hoverZone);
})();

// Партнёры — клон-карусель: дублируем список для бесшовного marquee
(function () {
  document.querySelectorAll('[data-marquee]').forEach((track) => {
    const items = Array.from(track.children);
    if (!items.length) return;
    items.forEach((el) => {
      const clone = el.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });
})();

(function () {
  const modal = document.getElementById('leadModal');
  const form = document.getElementById('leadForm');
  const status = document.getElementById('leadStatus');
  const nameI = document.getElementById('lead-name');
  const phoneI = document.getElementById('lead-phone');
  if (!modal || !form || !status || !nameI || !phoneI) return;

  let lastFocus = null;
  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => nameI.focus(), 50);
  }
  function close() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  document.querySelectorAll('[data-lead-open]').forEach(el => el.addEventListener('click', open));
  document.querySelectorAll('[data-lead-close]').forEach(el => el.addEventListener('click', close));
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });

  phoneI.addEventListener('input', () => {
    let v = phoneI.value.replace(/[^\d+]/g, '');
    if (v.length > 16) v = v.slice(0, 16);
    phoneI.value = v;
  });

  function setStatus(msg, kind) {
    status.textContent = msg || '';
    status.className = 'modal-status' + (kind ? ' ' + kind : '');
  }

  let submitting = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;
    setStatus('');

    const name = nameI.value.trim();
    const phone = phoneI.value.trim();
    const consent = form.elements.consent.checked;
    const hp = form.elements.company.value;

    if (name.length < 2) return setStatus('Укажите имя', 'err');
    if (phone.replace(/\D/g, '').length < 6) return setStatus('Укажите телефон', 'err');
    if (!consent) return setStatus('Нужно согласие на обработку данных', 'err');

    submitting = true;
    setStatus('Отправляем...', '');

    const payload = JSON.stringify({ name, phone, company: hp, page: location.pathname });
    const endpoints = ['/mail.php', '/api/lead']; // 1) PHP (Beget), 2) Node (Timeweb)

    let data = null;
    let lastErr = null;
    try {
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
          });
          // 404 / 405 → этот бэкенд не активен, пробуем следующий
          if (res.status === 404 || res.status === 405) continue;
          data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) throw new Error(data.error || 'Ошибка отправки');
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          // сетевая ошибка — пробуем следующий endpoint
        }
      }
      if (!data || !data.ok) throw lastErr || new Error('Ошибка отправки');

      setStatus('Контакт отправлен. Мы свяжемся с вами.', 'ok');
      form.reset();
      setTimeout(close, 1800);
    } catch (err) {
      setStatus(err.message || 'Не удалось отправить', 'err');
    } finally {
      submitting = false;
    }
  });
})();

(function () {
  document.querySelectorAll('.press-strip').forEach((section) => {
    const rail = section.querySelector('[data-rail]');
    const prev = section.querySelector('[data-rail-prev]');
    const next = section.querySelector('[data-rail-next]');
    if (!rail || !prev || !next) return;
    const step = () => Math.max(280, Math.round(rail.clientWidth * 0.75));
    prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
  });
})();

(function () {
  document.querySelectorAll('.photo-section').forEach((section) => {
    const rail = section.querySelector('[data-gallery-rail]');
    const prev = section.querySelector('[data-gallery-prev]');
    const next = section.querySelector('[data-gallery-next]');
    if (!rail || !prev || !next) return;
    const step = () => Math.max(300, Math.round(rail.clientWidth * 0.8));
    prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
  });

  const triggers = Array.from(document.querySelectorAll('[data-lightbox-src]'));
  const lightbox = document.querySelector('[data-lightbox]');
  const image = document.querySelector('[data-lightbox-image]');
  const caption = document.querySelector('[data-lightbox-caption]');
  const closeBtn = document.querySelector('[data-lightbox-close]');
  const prevBtn = document.querySelector('[data-lightbox-prev]');
  const nextBtn = document.querySelector('[data-lightbox-next]');
  if (!triggers.length || !lightbox || !image || !caption) return;

  let current = 0;
  function show(index) {
    current = (index + triggers.length) % triggers.length;
    const trigger = triggers[current];
    image.src = trigger.dataset.lightboxSrc;
    image.alt = trigger.dataset.lightboxCaption || 'Фото Дальневосточной кинопремии';
    caption.textContent = trigger.dataset.lightboxCaption || '';
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  function close() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    image.removeAttribute('src');
  }

  triggers.forEach((trigger, index) => trigger.addEventListener('click', () => show(index)));
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', () => show(current - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => show(current + 1));
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) close();
  });
  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });
})();

(function () {
  const targets = document.querySelectorAll('.section-title .hl');
  if (!targets.length || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('lit'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('lit');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6, rootMargin: '0px 0px -10% 0px' });
  targets.forEach((el) => io.observe(el));
})();
