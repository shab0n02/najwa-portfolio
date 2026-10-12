// Lightbox for carousels, decks and photos, plus click-to-load YouTube.
(() => {
  const box = document.getElementById("lightbox");
  const img = document.getElementById("lb-img");
  const title = document.getElementById("lb-title");
  const count = document.getElementById("lb-count");
  const prev = box.querySelector(".lb-prev");
  const next = box.querySelector(".lb-next");
  let slides = [];
  let index = 0;
  let opener = null;

  // A piece lists its images either as a numbered folder (data-gallery + data-count)
  // or as an explicit comma-separated list (data-srcs).
  function slidesFor(el) {
    if (el.dataset.gallery) {
      const n = Number(el.dataset.count);
      return Array.from({ length: n }, (_, i) => `${el.dataset.gallery}/${String(i + 1).padStart(2, "0")}.jpg`);
    }
    return el.dataset.srcs.split(",").map((s) => s.trim());
  }

  function show(i) {
    index = (i + slides.length) % slides.length;
    img.src = slides[index];
    img.alt = `${title.textContent}, image ${index + 1} of ${slides.length}`;
    const multi = slides.length > 1;
    count.textContent = multi ? `${index + 1} / ${slides.length}` : "";
    prev.hidden = next.hidden = !multi;
    // Warm the next image so paging feels instant.
    if (multi) new Image().src = slides[(index + 1) % slides.length];
  }

  function open(el) {
    opener = el;
    slides = slidesFor(el);
    title.textContent = el.dataset.title || "";
    box.showModal();
    show(Number(el.dataset.start || 0));
  }

  document.querySelectorAll(".piece, .cert").forEach((el) => {
    el.addEventListener("click", () => open(el));
  });

  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  box.querySelector(".lb-close").addEventListener("click", () => box.close());
  box.addEventListener("close", () => { img.removeAttribute("src"); opener && opener.focus(); });

  // Clicking the dark area around the image closes the viewer.
  box.addEventListener("click", (e) => {
    if (e.target === box || e.target.classList.contains("lb-stage")) box.close();
  });

  box.addEventListener("keydown", (e) => {
    if (slides.length < 2) return;
    if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
  });

  let touchX = null;
  box.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    if (touchX === null || slides.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  // YouTube: swap the thumbnail for the player only when asked.
  document.querySelectorAll(".yt").forEach((wrap) => {
    wrap.querySelector(".yt-play").addEventListener("click", () => {
      const id = wrap.dataset.yt;
      wrap.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="Qissa-E-Hunar documentary" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    });
  });

  // Only one reel plays at a time.
  const reels = document.querySelectorAll(".reels video");
  reels.forEach((v) => v.addEventListener("play", () => reels.forEach((o) => o !== v && o.pause())));
})();
