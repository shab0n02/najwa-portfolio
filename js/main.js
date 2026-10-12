// Motion, lightbox and media behaviour for the portfolio.
// Everything degrades: no JS shows a static page, reduced motion turns effects off.
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- Smooth scroll ---------------- */
  // Smoothing is only for mouse wheels. Touch screens keep native momentum scrolling,
  // which already runs at the display's full refresh rate (60/90/120 Hz).
  const scrollTimeline = window.CSS && CSS.supports("animation-timeline: scroll()");
  let lenis = null;
  if (!reduced && finePointer && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
  }
  const scrollToTarget = (el) => {
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      scrollToTarget(target);
      history.replaceState(null, "", id === "#top" ? location.pathname : id);
    });
  });

  /* ---------------- Split headings into words ---------------- */
  const splitTargets = $$(".project-title, .section-title, .intro-lead, .contact-title");
  splitTargets.forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--wi:${i}">${w}</span></span>`).join(" ");
    el.classList.add("split");
  });

  /* ---------------- Reveal on scroll ---------------- */
  const revealEls = [];
  const mark = (el, cls, vars = {}) => {
    el.classList.add(cls);
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
    revealEls.push(el);
  };
  splitTargets.forEach((el) => revealEls.push(el));
  $$(".project-info, .intro-body, .section-sub").forEach((el) => mark(el, "reveal", { "--d": 120 }));
  $$(".index-list li").forEach((el, i) => mark(el, "reveal", { "--d": i * 70 }));
  // Stagger left to right within each row, so every row lands the same way.
  const colsOf = (grid) => {
    const cols = getComputedStyle(grid).gridTemplateColumns;
    return cols && cols !== "none" ? cols.split(" ").filter(Boolean).length : grid.children.length || 1;
  };
  const gridItems = $$(".grid, .reels, .photo-row");
  const setStagger = () => gridItems.forEach((grid) => {
    const cols = colsOf(grid);
    [...grid.children].forEach((el, i) => el.style.setProperty("--i", i % cols));
  });
  gridItems.forEach((grid) => [...grid.children].forEach((el) => mark(el, "rise3d")));
  setStagger();
  addEventListener("resize", setStagger, { passive: true });
  $$(".yt").forEach((el) => mark(el, "rise3d"));
  $$(".stats li").forEach((el, i) => mark(el, "reveal", { "--d": i * 120 }));
  $$(".jobs > li").forEach((el, i) => mark(el, "reveal", { "--d": i * 90 }));
  $$(".about-cols > div").forEach((el, i) => mark(el, "reveal", { "--d": i * 120 }));
  $$(".contact-links li, .fine").forEach((el, i) => mark(el, "reveal", { "--d": 200 + i * 80 }));
  $$(".index-list, .stats, .jobs").forEach((el) => mark(el, "draw"));

  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        if (en.target.matches(".stats li")) countUp(en.target.querySelector("strong"));
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------------- Count up ---------------- */
  function countUp(el) {
    if (!el || el.dataset.done) return;
    el.dataset.done = 1;
    const raw = el.textContent.trim();
    const target = parseFloat(raw.replace(/,/g, ""));
    const decimals = (raw.split(".")[1] || "").replace(/\D/g, "").length;
    const suffix = raw.replace(/[\d.,]/g, "");
    const fmt = (v) => v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    const t0 = performance.now(), dur = 1600;
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(target * e);
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = fmt(0);
    requestAnimationFrame(step);
  }

  /* ---------------- Carousel stacks ---------------- */
  // Multi-slide pieces get their next two slides layered behind the cover.
  $$(".piece[data-gallery]").forEach((p) => {
    const n = Number(p.dataset.count);
    const start = Number(p.dataset.start || 0);
    if (n < 2 || start !== 0) return;
    [2, 3].slice(0, n - 1).reverse().forEach((k, idx) => {
      const layer = document.createElement("span");
      layer.className = `stack-layer ${idx === 0 && n > 2 ? "l2" : "l1"}`;
      layer.setAttribute("aria-hidden", "true");
      layer.innerHTML = `<img src="${p.dataset.gallery}/t/${String(k).padStart(2, "0")}.jpg" alt="" loading="lazy" decoding="async">`;
      p.prepend(layer);
    });
  });

  /* ---------------- 3D tilt ---------------- */
  if (finePointer && !reduced) {
    $$(".piece").forEach((p) => {
      const face = p.querySelector(".piece-face");
      if (!face) return;
      const max = p.closest(".photo-row") ? 5 : 9;
      p.addEventListener("pointermove", (e) => {
        const r = p.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        p.classList.add("is-tilting");
        face.style.setProperty("--ry", `${(x - 0.5) * max * 2}deg`);
        face.style.setProperty("--rx", `${(0.5 - y) * max * 2}deg`);
        face.style.setProperty("--gx", `${x * 100}%`);
        face.style.setProperty("--gy", `${y * 100}%`);
      });
      p.addEventListener("pointerleave", () => {
        p.classList.remove("is-tilting");
        face.style.setProperty("--rx", "0deg");
        face.style.setProperty("--ry", "0deg");
      });
    });

    $$(".reels li").forEach((li) => {
      const v = li.querySelector("video");
      li.addEventListener("pointermove", (e) => {
        const r = li.getBoundingClientRect();
        v.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
        v.style.setProperty("--rx", `${(0.5 - (e.clientY - r.top) / r.height) * 6}deg`);
      });
      li.addEventListener("pointerleave", () => { v.style.setProperty("--ry", "0deg"); v.style.setProperty("--rx", "0deg"); });
    });

    // Magnetic buttons and contact links
    $$(".btn, .contact-links a, .yt-label").forEach((b) => {
      const host = b.classList.contains("yt-label") ? b.closest(".yt-play") : b;
      host.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
      });
      host.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });

    // Hero: portrait turns toward the pointer, a soft light follows it
    const hero = $(".hero");
    const glow = document.createElement("div");
    glow.className = "hero-glow";
    hero.prepend(glow);
    const portrait = $(".hero-portrait img");
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      hero.style.setProperty("--gx", `${x * 100}%`);
      hero.style.setProperty("--gy", `${y * 100}%`);
      portrait.style.setProperty("--pry", `${(x - 0.5) * 22}deg`);
      portrait.style.setProperty("--prx", `${(0.5 - y) * 14}deg`);
    });
    hero.addEventListener("pointerleave", () => {
      portrait.style.setProperty("--pry", "0deg");
      portrait.style.setProperty("--prx", "0deg");
    });

    // Floating preview on the work index
    const preview = document.createElement("div");
    preview.className = "index-preview";
    preview.innerHTML = "<img alt=\"\">";
    document.body.append(preview);
    const pimg = preview.firstChild;
    $$(".index-list a").forEach((a) => {
      if (a.dataset.preview) new Image().src = a.dataset.preview;
      a.addEventListener("pointerenter", () => { pimg.src = a.dataset.preview; preview.classList.add("on"); });
      a.addEventListener("pointerleave", () => preview.classList.remove("on"));
    });

    // Pointer label over viewable work
    const tag = document.createElement("div");
    tag.className = "cursor-tag";
    tag.setAttribute("aria-hidden", "true");
    document.body.append(tag);
    const tagFor = (el) => (el.closest(".yt-play") ? "Play" : el.closest(".piece, .cert") ? "View" : "");
    document.addEventListener("pointerover", (e) => {
      const label = tagFor(e.target);
      tag.textContent = label;
      tag.classList.toggle("on", !!label);
    });

    // Pointer-following elements share one loop. Smoothing is time-based, so it feels
    // the same at 60, 120 or 144 Hz, and the loop sleeps once everything has caught up.
    const ptr = { x: innerWidth / 2, y: innerHeight / 2 };
    const pv = { x: ptr.x, y: ptr.y }, tg = { x: ptr.x, y: ptr.y };
    let running = false, last = 0;
    const ease = (k, dt) => 1 - Math.pow(1 - k, dt / 16.667);
    const follow = (now) => {
      const dt = Math.min(64, now - (last || now - 16.667));
      last = now;
      const vx = ptr.x - pv.x;
      const a = ease(0.14, dt), b = ease(0.3, dt);
      pv.x = lerp(pv.x, ptr.x, a); pv.y = lerp(pv.y, ptr.y, a);
      tg.x = lerp(tg.x, ptr.x, b); tg.y = lerp(tg.y, ptr.y, b);
      preview.style.transform = `translate3d(${Math.min(pv.x + 170, innerWidth - 140)}px, ${pv.y}px, 0) translate(-50%, -50%) rotate(${clamp(vx * 0.08, -12, 12)}deg)`;
      tag.style.transform = `translate3d(${tg.x}px, ${tg.y}px, 0) translate(-50%, -50%)`;
      if (Math.abs(ptr.x - pv.x) + Math.abs(ptr.y - pv.y) > 0.3) requestAnimationFrame(follow);
      else { running = false; last = 0; }
    };
    addEventListener("pointermove", (e) => {
      ptr.x = e.clientX; ptr.y = e.clientY;
      if (!running) { running = true; requestAnimationFrame(follow); }
    }, { passive: true });
  }

  /* ---------------- Scroll-linked effects ---------------- */
  // One read and one write per frame, compositor-only properties (transform, opacity),
  // and nothing at all for effects the browser's scroll timeline is already running.
  const nav = $(".nav");
  const hero = $(".hero");
  const heroText = $$(".hero-name, .hero-meta");
  const portraitImg = $(".hero-portrait img");
  const progress = $(".progress");
  const photoImgs = $$(".photo-row .piece img");
  const navLinks = $$(".nav ul a");
  let heroH = hero.offsetHeight, maxY = 1, lastY = scrollY, ticking = false;
  let solid = null, hidden = null, finished = false;

  const measure = () => {
    heroH = hero.offsetHeight;
    maxY = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  };
  measure();
  new ResizeObserver(measure).observe(document.body);

  // Photos only need work while they're on screen.
  const visiblePhotos = new Set();
  if (!scrollTimeline && !reduced) {
    const pio = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting ? visiblePhotos.add(e.target) : visiblePhotos.delete(e.target)));
    photoImgs.forEach((im) => pio.observe(im));
  }

  const update = () => {
    ticking = false;
    const y = scrollY;
    // read
    const photoRects = [...visiblePhotos].map((im) => [im, im.parentElement.getBoundingClientRect()]);

    // write
    if (!scrollTimeline) progress.style.transform = `scaleX(${Math.min(1, y / maxY)})`;
    if (!finished && maxY - y < 4) { finished = true; revealEls.forEach((el) => el.classList.add("in")); }

    const isSolid = y > heroH - 80;
    if (isSolid !== solid) { solid = isSolid; nav.classList.toggle("is-solid", solid); }
    let isHidden = hidden;
    if (y > heroH && y > lastY + 4 && !nav.matches(":focus-within")) isHidden = true;
    else if (y < lastY - 4 || y <= heroH) isHidden = false;
    if (isHidden !== hidden) { hidden = isHidden; nav.classList.toggle("is-hidden", hidden); }
    lastY = y;

    if (!reduced && !scrollTimeline && y <= heroH * 1.05) {
      // Name, intro and buttons lift and fade as one block, so they never collide.
      const p = Math.min(1, y / heroH);
      const t = `translate3d(0, ${-y * 0.18}px, 0)`, o = Math.max(0, 1 - p * 1.4);
      heroText.forEach((el) => { el.style.transform = t; el.style.opacity = o; });
      portraitImg.style.translate = `0 ${-y * 0.06}px`;
    }
    photoRects.forEach(([im, r]) => {
      const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      im.style.translate = `0 ${k * -48}px`;
    });
  };
  const requestUpdate = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  // Current section in the nav, without measuring on every frame.
  const current = new Map();
  const sio = new IntersectionObserver((es) => {
    es.forEach((e) => current.set(e.target.id, e.isIntersecting));
    const id = [...current].filter(([, v]) => v).map(([k]) => k).pop();
    navLinks.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${id}`));
  }, { rootMargin: "-40% 0px -55% 0px" });
  $$("main [id], #contact").filter((el) => navLinks.some((a) => a.getAttribute("href") === `#${el.id}`)).forEach((el) => sio.observe(el));

  if (lenis) {
    lenis.on("scroll", update);
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  } else {
    addEventListener("scroll", requestUpdate, { passive: true });
  }
  addEventListener("resize", () => { measure(); requestUpdate(); }, { passive: true });
  update();

  /* ---------------- Lightbox ---------------- */
  const box = $("#lightbox");
  const img = $("#lb-img");
  const title = $("#lb-title");
  const count = $("#lb-count");
  const prev = $(".lb-prev", box);
  const next = $(".lb-next", box);
  let slides = [];
  let index = 0;
  let opener = null;
  let busy = false;

  function slidesFor(el) {
    if (el.dataset.gallery) {
      const n = Number(el.dataset.count);
      return Array.from({ length: n }, (_, i) => `${el.dataset.gallery}/${String(i + 1).padStart(2, "0")}.jpg`);
    }
    return el.dataset.srcs.split(",").map((s) => s.trim());
  }

  const load = (src) => new Promise((res) => {
    const im = new Image();
    im.onload = im.onerror = () => res();
    im.src = src;
  });

  function setMeta() {
    img.alt = `${title.textContent}, image ${index + 1} of ${slides.length}`;
    const multi = slides.length > 1;
    count.textContent = multi ? `${index + 1} / ${slides.length}` : "";
    prev.hidden = next.hidden = !multi;
    if (multi) load(slides[(index + 1) % slides.length]);
  }

  async function show(i, dir = 0) {
    if (busy) return;
    busy = true;
    const nextIndex = (i + slides.length) % slides.length;
    if (dir && !reduced) {
      await img.animate(
        [{ transform: "none", opacity: 1 }, { transform: `translateX(${-dir * 60}px) rotateY(${dir * 12}deg) scale(.96)`, opacity: 0 }],
        { duration: 220, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }
      ).finished;
    }
    index = nextIndex;
    await load(slides[index]);
    img.src = slides[index];
    setMeta();
    if (dir && !reduced) {
      await img.animate(
        [{ transform: `translateX(${dir * 60}px) rotateY(${-dir * 12}deg) scale(.96)`, opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 420, easing: "cubic-bezier(.2,.7,.1,1)", fill: "forwards" }
      ).finished;
    }
    busy = false;
  }

  // Zoom from the clicked thumbnail into place
  function flipFrom(el) {
    const thumb = (el.querySelector(".piece-face img") || el).getBoundingClientRect();
    const end = img.getBoundingClientRect();
    if (!end.width || !thumb.width) return;
    const dx = thumb.left + thumb.width / 2 - (end.left + end.width / 2);
    const dy = thumb.top + thumb.height / 2 - (end.top + end.height / 2);
    const s = thumb.width / end.width;
    img.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.6, borderRadius: "8px" },
       { transform: "none", opacity: 1, borderRadius: "4px" }],
      { duration: 650, easing: "cubic-bezier(.2,.7,.1,1)" }
    );
  }

  async function open(el) {
    opener = el;
    slides = slidesFor(el);
    title.textContent = el.dataset.title || "";
    index = Number(el.dataset.start || 0);
    await load(slides[index]);
    img.src = slides[index];
    setMeta();
    box.classList.remove("closing");
    box.showModal();
    lenis && lenis.stop();
    if (!reduced && el.classList.contains("piece")) requestAnimationFrame(() => flipFrom(el));
  }

  async function close() {
    if (!box.open || box.classList.contains("closing")) return;
    if (!reduced) {
      box.classList.add("closing");
      img.animate([{ transform: "none" }, { transform: "scale(.92)" }], { duration: 380, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" });
      await new Promise((r) => setTimeout(r, 360));
    }
    box.close();
  }

  $$(".piece, .cert").forEach((el) => el.addEventListener("click", () => open(el)));
  prev.addEventListener("click", () => show(index - 1, -1));
  next.addEventListener("click", () => show(index + 1, 1));
  $(".lb-close", box).addEventListener("click", close);
  box.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  box.addEventListener("close", () => {
    box.classList.remove("closing");
    img.getAnimations().forEach((a) => a.cancel());
    img.removeAttribute("src");
    lenis && lenis.start();
    opener && opener.focus({ preventScroll: true });
  });
  box.addEventListener("click", (e) => {
    if (e.target === box || e.target.classList.contains("lb-stage")) close();
  });
  box.addEventListener("keydown", (e) => {
    if (slides.length < 2) return;
    if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1, 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1, -1); }
  });
  let touchX = null;
  box.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    if (touchX === null || slides.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    touchX = null;
  });

  /* ---------------- Media ---------------- */
  $$(".yt").forEach((wrap) => {
    $(".yt-play", wrap).addEventListener("click", () => {
      const id = wrap.dataset.yt;
      wrap.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="Qissa-E-Hunar documentary" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    });
  });

  const reels = $$(".reels video");
  reels.forEach((v) => v.addEventListener("play", () => reels.forEach((o) => o !== v && o.pause())));
})();
