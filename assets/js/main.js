(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Header ----------
  const header = document.querySelector(".site-header");
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 30);
      header.classList.toggle("is-hidden", y > 400 && y > lastY && !document.body.classList.contains("nav-open"));
    }
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- Menú móvil ----------
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".nav__links a").forEach((a) =>
      a.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // ---------- Reloj Valparaíso ----------
  const clock = document.querySelector("[data-clock]");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => (clock.textContent = fmt.format(new Date()));
    tick();
    setInterval(tick, 1000);
  }

  // ---------- Año ----------
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // ---------- Aparición al hacer scroll ----------
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  window.TA_observeReveal = (root = document) =>
    root.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => revealObserver.observe(el));
  window.TA_observeReveal();

  // ---------- Manifiesto: palabras que se encienden con el scroll ----------
  const manifesto = document.querySelector("[data-manifesto]");
  if (manifesto) {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part.trim()) frag.appendChild(document.createTextNode(part));
            else {
              const s = document.createElement("span");
              s.className = "word";
              s.textContent = part;
              frag.appendChild(s);
            }
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(manifesto);
    const words = [...manifesto.querySelectorAll(".word")];
    const update = () => {
      const r = manifesto.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const n = Math.round(progress * words.length);
      words.forEach((w, i) => w.classList.toggle("is-on", i < n));
    };
    if (reduceMotion) words.forEach((w) => w.classList.add("is-on"));
    else {
      window.addEventListener("scroll", update, { passive: true });
      update();
    }
  }

  // ---------- Contadores ----------
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        counterObserver.unobserve(el);
        const target = parseFloat(el.dataset.count);
        if (reduceMotion) {
          el.textContent = target.toLocaleString("es-CL");
          return;
        }
        const dur = 1800;
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - k, 4);
          el.textContent = Math.round(target * eased).toLocaleString("es-CL");
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.5 }
  );
  // El HTML trae el valor final (legible sin JS); la animación parte de cero.
  window.TA_observeCounters = () =>
    document.querySelectorAll("[data-count]").forEach((el) => {
      if (!reduceMotion && !el.dataset.counted) el.textContent = "0";
      el.dataset.counted = "1";
      counterObserver.observe(el);
    });
  window.TA_observeCounters();

  // ---------- Parallax ----------
  const parallax = [...document.querySelectorAll("[data-parallax]")];
  if (parallax.length && !reduceMotion) {
    const run = () => {
      parallax.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        const k = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        el.style.transform = `translate3d(0, ${k * -60}px, 0)`;
      });
    };
    window.addEventListener("scroll", run, { passive: true });
    run();
  }

  // ---------- Mosaico del CTA: cielo ocre→arena arriba, ladera verde→agua abajo (como el logo) ----------
  const sky = ["#e39a2d", "#e3b43a", "#e9c95a", "#efe58f", "#f3eebc"];
  const land = ["#2e8c7a", "#5cb87a", "#1f6f6a", "#2bb6c8", "#a8dcdc"];
  document.querySelectorAll("[data-pixels]").forEach((el) => {
    for (let i = 0; i < 49; i++) {
      const r = Math.floor(i / 7), c = i % 7;
      const s = document.createElement("span");
      const ridge = 3 + Math.round(Math.sin(c * 0.9) * 1.2);
      if (r < ridge) {
        const k = Math.min(sky.length - 1, Math.max(0, Math.round((r + c) / 3 + Math.random() - 0.5)));
        s.style.background = Math.random() < 0.82 ? sky[k] : "transparent";
      } else {
        s.style.background = Math.random() < 0.8 ? land[Math.floor(Math.random() * land.length)] : "transparent";
      }
      if (r === ridge && Math.random() < 0.35) s.style.background = "#ffffff";
      el.appendChild(s);
    }
  });
})();
