/**
 * Renderiza noticias, publicaciones y equipo desde /data/*.json.
 * Para actualizar contenidos basta con editar esos archivos.
 */
(function () {
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  const LAB_AUTHORS = /(Freddy(\s+A\.|\s+Alejandro)?\s+Saavedra(\s+Pimentel)?|F\.\s*Saavedra|Marcelo\s+Legu[ií]a(\s+Cruz)?|Ana\s+Hern[aá]ndez(-Duarte)?|Hern[aá]ndez-Duarte|Carlos\s+Romero|Valentina(\s+Ignacia)?\s+Contreras(\s+Figueroa)?|Javier\s+Medina|Pablo\s+Arancibia|Yael\s+Aguirre|Daniela\s+Gonz[aá]lez)/g;

  const PUBLISHERS = {
    "10.1002/joc": "Int. Journal of Climatology",
    "10.1002/2017WR": "Water Resources Research",
    "10.1002/essoar": "ESS Open Archive",
    "10.1016/j.jenvman": "J. Environmental Management",
    "10.5194/tc": "The Cryosphere",
    "10.5194/os": "Ocean Science",
    "10.5194/essd": "Earth System Science Data",
    "10.3389/feart": "Frontiers in Earth Science",
    "10.3390/fire": "Fire · MDPI",
    "10.3390/rs": "Remote Sensing · MDPI",
    "revistas.ubiobio.cl": "Revista Urbano · UBB",
  };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const fmtDate = (iso) => {
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? "" : d.toLocaleDateString("es-CL", { year: "numeric", month: "short", day: "numeric" });
  };

  function topicOf(n) {
    const t = (n.titulo + " " + n.subtitulo).toLowerCase();
    if (/niev|criósfera|nival/.test(t)) return "Nieve";
    if (/incendio/.test(t)) return "Incendios";
    if (/océano|oceano/.test(t)) return "Océanos";
    if (/ciudad|urban|quilpué/.test(t)) return "Ciudades";
    if (/curso|capacitación|seminario/.test(t)) return "Formación";
    if (/dron/.test(t)) return "Drones";
    if (/congreso/.test(t)) return "Congresos";
    return "Laboratorio";
  }

  function publisherOf(doi) {
    for (const key in PUBLISHERS) if (doi.includes(key)) return PUBLISHERS[key];
    const m = doi.match(/10\.\d{4,5}/);
    return m ? "DOI " + m[0] : "";
  }

  const cache = {};
  async function getJSON(name) {
    if (!cache[name]) {
      cache[name] = fetch(`data/${name}.json`).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      });
    }
    return cache[name];
  }

  function done(root) {
    window.TA_observeReveal && window.TA_observeReveal(root);
  }

  function fail(el, what) {
    el.innerHTML = `<p class="empty">No fue posible cargar ${what}. Si abres el sitio directamente desde el disco, usa un servidor local (ver README).</p>`;
  }

  // ---------- Noticias ----------
  function newsCard(n, i) {
    return `
      <a class="news-card" href="${esc(n.url)}" target="_blank" rel="noopener" data-reveal style="--d:${(i % 3) * 0.08}s">
        <div class="news-card__img"><img src="${esc(n.imagen)}" alt="" loading="lazy" decoding="async"></div>
        <div class="news-card__meta"><span class="tag">${topicOf(n)}</span><time datetime="${esc(n.fecha)}">${fmtDate(n.fecha)}</time></div>
        <h3>${esc(n.titulo)}</h3>
        <p>${esc(n.subtitulo)}</p>
      </a>`;
  }

  async function renderNews() {
    const el = document.querySelector("[data-news]");
    if (!el) return;
    try {
      const all = (await getJSON("noticias")).slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      const limit = parseInt(el.dataset.news, 10);

      if (limit) {
        el.innerHTML = all.slice(0, limit).map(newsCard).join("");
        return done(el);
      }

      const search = document.querySelector("[data-news-search]");
      const filters = document.querySelector("[data-news-filters]");
      const more = document.querySelector("[data-news-more]");
      const topics = ["Todas", ...new Set(all.map(topicOf))];
      let topic = "Todas";
      let shown = 9;

      filters.innerHTML = topics
        .map((t) => `<button class="filter-btn" type="button" aria-pressed="${t === topic}" data-topic="${esc(t)}">${esc(t)}</button>`)
        .join("");

      const draw = () => {
        const q = (search.value || "").toLowerCase().trim();
        const list = all.filter(
          (n) => (topic === "Todas" || topicOf(n) === topic) && (!q || (n.titulo + " " + n.subtitulo).toLowerCase().includes(q))
        );
        el.innerHTML = list.length ? list.slice(0, shown).map(newsCard).join("") : '<p class="empty">Sin resultados.</p>';
        el.classList.toggle("news-grid--featured", !q && topic === "Todas");
        more.hidden = list.length <= shown;
        done(el);
      };

      filters.addEventListener("click", (e) => {
        const b = e.target.closest("[data-topic]");
        if (!b) return;
        topic = b.dataset.topic;
        shown = 9;
        filters.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        draw();
      });
      search.addEventListener("input", () => {
        shown = 9;
        draw();
      });
      more.querySelector("button").addEventListener("click", () => {
        shown += 9;
        draw();
      });
      draw();
    } catch (e) {
      fail(el, "las noticias");
    }
  }

  // ---------- Publicaciones ----------
  function authorsHTML(a) {
    return esc(a).replace(LAB_AUTHORS, (m) => `<b>${m}</b>`);
  }

  function pubRow(p, expandable) {
    const title = p.Titulo?.es || p.Titulo?.en || "";
    const abstract = p.Extracto?.es || p.Extracto?.en || "";
    const id = "pub-" + esc(p.ID);
    if (!expandable) {
      return `
        <a class="pub" href="${esc(p.DOI)}" target="_blank" rel="noopener" data-thumb="${esc(p.Image)}" data-reveal>
          <span class="pub__year">${esc(p.Año)}</span>
          <span class="pub__title">${esc(title)}<small>${authorsHTML(p.Autor)}</small></span>
          <span class="pub__journal">${esc(publisherOf(p.DOI))}</span>
          <span class="pub__go">${ARROW}</span>
        </a>`;
    }
    return `
      <article class="pub pub--expandable" data-reveal>
        <span class="pub__year">${esc(p.Año)}</span>
        <button class="pub__toggle" type="button" aria-expanded="false" aria-controls="${id}" data-toggle>
          <span class="pub__title">${esc(title)}<small>${authorsHTML(p.Autor)}</small></span>
        </button>
        <span class="pub__journal">${esc(publisherOf(p.DOI))}</span>
        <a class="pub__go" href="${esc(p.DOI)}" target="_blank" rel="noopener" aria-label="Abrir publicación">${ARROW}</a>
        <div class="pub-detail" id="${id}" hidden>
          <img src="${esc(p.Image)}" alt="" loading="lazy">
          <div>
            ${p.Titulo?.en ? `<p class="mono" style="color:var(--accent);margin-bottom:12px">${esc(p.Titulo.en)}</p>` : ""}
            <p>${esc(abstract)}</p>
          </div>
        </div>
      </article>`;
  }

  function attachThumb(container) {
    const thumb = document.createElement("div");
    thumb.className = "pub__thumb";
    thumb.innerHTML = "<img alt=''>";
    document.body.appendChild(thumb);
    const img = thumb.querySelector("img");
    container.addEventListener("pointerover", (e) => {
      const row = e.target.closest("[data-thumb]");
      if (!row || e.pointerType !== "mouse") return;
      img.src = row.dataset.thumb;
      thumb.classList.add("is-on");
    });
    container.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest("[data-thumb]")) thumb.classList.remove("is-on");
    });
    container.addEventListener("pointermove", (e) => {
      thumb.style.left = e.clientX + 170 + "px";
      thumb.style.top = e.clientY + "px";
    });
  }

  async function renderPubs() {
    const el = document.querySelector("[data-pubs]");
    if (!el) return;
    try {
      const all = (await getJSON("publications")).slice().sort((a, b) => b.Año - a.Año || b.ID - a.ID);
      document.querySelectorAll("[data-pubs-count]").forEach((c) => {
        c.dataset.count = all.length;
        c.textContent = all.length;
      });
      window.TA_observeCounters && window.TA_observeCounters();

      const limit = parseInt(el.dataset.pubs, 10);
      if (limit) {
        el.innerHTML = all.slice(0, limit).map((p) => pubRow(p, false)).join("");
        attachThumb(el);
        return done(el);
      }

      const search = document.querySelector("[data-pubs-search]");
      const filters = document.querySelector("[data-pubs-filters]");
      const years = ["Todos", ...new Set(all.map((p) => String(p.Año)))];
      let year = "Todos";

      filters.innerHTML = years
        .map((y) => `<button class="filter-btn" type="button" aria-pressed="${y === year}" data-y="${y}">${y}</button>`)
        .join("");

      const draw = () => {
        const q = (search.value || "").toLowerCase().trim();
        const list = all.filter((p) => {
          const hay = [p.Titulo?.es, p.Titulo?.en, p.Autor, p.Extracto?.es].join(" ").toLowerCase();
          return (year === "Todos" || String(p.Año) === year) && (!q || hay.includes(q));
        });
        el.innerHTML = list.length ? list.map((p) => pubRow(p, true)).join("") : '<p class="empty">Sin resultados.</p>';
        done(el);
      };

      el.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-toggle]");
        if (!btn) return;
        const detail = document.getElementById(btn.getAttribute("aria-controls"));
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        detail.hidden = open;
      });
      filters.addEventListener("click", (e) => {
        const b = e.target.closest("[data-y]");
        if (!b) return;
        year = b.dataset.y;
        filters.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        draw();
      });
      search.addEventListener("input", draw);
      draw();
    } catch (e) {
      fail(el, "las publicaciones");
    }
  }

  // ---------- Equipo ----------
  const initials = (n) =>
    n
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("");

  function memberCard(m, i) {
    const photo = m.foto
      ? `<img src="${esc(m.foto)}" alt="Retrato de ${esc(m.nombre)}" loading="lazy" decoding="async">`
      : `<span class="member__initials">${esc(initials(m.nombre))}</span>`;
    return `
      <article class="member" data-group="${esc(m.grupo || "antiguos")}" data-reveal style="--d:${(i % 4) * 0.07}s">
        <div class="member__photo">${photo}</div>
        ${m.rol ? `<span class="member__role">${esc(m.rol)}</span>` : ""}
        <h3>${esc(m.nombre)}</h3>
        <p>${esc(m.bio)}</p>
        ${m.email ? `<a class="member__mail" href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ""}
      </article>`;
  }

  async function renderTeam() {
    const el = document.querySelector("[data-team]");
    if (!el) return;
    try {
      const data = await getJSON("equipo");
      const mode = el.dataset.team;

      if (mode === "direccion") {
        el.innerHTML = data.actual.filter((m) => m.grupo === "direccion").map(memberCard).join("");
        return done(el);
      }

      const filters = document.querySelector("[data-team-filters]");
      const groups = [
        ["todos", "Todo el equipo"],
        ["direccion", "Dirección"],
        ["investigacion", "Investigación"],
        ["comunicaciones", "Comunicaciones"],
      ];
      filters.innerHTML = groups
        .map(([k, l], i) => `<button class="filter-btn" type="button" aria-pressed="${i === 0}" data-g="${k}">${l}</button>`)
        .join("");
      el.innerHTML = data.actual.map(memberCard).join("");

      filters.addEventListener("click", (e) => {
        const b = e.target.closest("[data-g]");
        if (!b) return;
        filters.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        el.querySelectorAll(".member").forEach((m) => {
          m.hidden = b.dataset.g !== "todos" && m.dataset.group !== b.dataset.g;
        });
      });

      const alumni = document.querySelector("[data-alumni]");
      if (alumni) alumni.innerHTML = data.antiguos.map(memberCard).join("");
      done(document);
    } catch (e) {
      fail(el, "el equipo");
    }
  }

  // ---------- Plataformas ----------
  const pad = (n) => String(n + 1).padStart(2, "0");
  const shortUrl = (u) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");

  function browserBar(p) {
    return `<div class="browser__bar"><i></i><i></i><i></i><span class="browser__url">${esc(shortUrl(p.url))}</span></div>`;
  }

  function showcaseHTML(list) {
    const items = list
      .map(
        (p, i) => `
        <li>
          <a class="showcase__item" href="${esc(p.url)}" target="_blank" rel="noopener" data-i="${i}">
            <span class="showcase__num">${pad(i)}</span>
            <span class="showcase__title">${esc(p.titulo)}<small>${esc(p.categoria)} · ${esc(p.proyecto)}</small></span>
            <span class="showcase__go">${ARROW}</span>
            <span class="showcase__bar" aria-hidden="true"></span>
            <span class="showcase__mobile">
              <img src="${esc(p.imagen)}" alt="" loading="lazy" decoding="async">
              <span>${esc(p.descripcion)}</span>
            </span>
          </a>
        </li>`
      )
      .join("");
    const shots = list
      .map((p, i) => `<img src="${esc(p.imagen)}" alt="Vista de ${esc(p.titulo)}" loading="lazy" decoding="async" data-shot="${i}">`)
      .join("");
    return `
      <ol class="showcase__list">${items}</ol>
      <div class="showcase__stage">
        <div class="browser">
          <div class="browser__bar"><i></i><i></i><i></i><span class="browser__url" data-sc-url></span><span class="browser__live">En línea</span></div>
          <div class="browser__view">${shots}<span class="browser__scan" aria-hidden="true"></span><span class="browser__idx mono" data-sc-idx></span></div>
        </div>
        <div class="showcase__info">
          <div class="showcase__meta"><span class="tag" data-sc-cat></span><span class="mono" data-sc-proj></span></div>
          <p data-sc-desc></p>
          <div class="chips" data-sc-chips></div>
          <a class="btn btn--primary" data-sc-link href="#" target="_blank" rel="noopener">Abrir plataforma ${ARROW}</a>
        </div>
      </div>`;
  }

  function initShowcase(el, list) {
    el.innerHTML = showcaseHTML(list);
    const items = [...el.querySelectorAll(".showcase__item")];
    const shots = [...el.querySelectorAll("[data-shot]")];
    const $ = (s) => el.querySelector(s);
    let current = -1;

    const activate = (i) => {
      if (i === current) return;
      current = i;
      const p = list[i];
      items.forEach((it, k) => it.classList.toggle("is-active", k === i));
      shots.forEach((s, k) => s.classList.toggle("is-on", k === i));
      $("[data-sc-url]").textContent = shortUrl(p.url);
      $("[data-sc-idx]").textContent = `${pad(i)} / ${pad(list.length - 1)}`;
      $("[data-sc-cat]").textContent = p.categoria;
      $("[data-sc-proj]").textContent = p.proyecto;
      $("[data-sc-desc]").textContent = p.descripcion;
      $("[data-sc-chips]").innerHTML = p.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("");
      $("[data-sc-link]").href = p.url;
    };

    items.forEach((it, i) => {
      it.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && activate(i));
      it.addEventListener("focus", () => activate(i));
    });

    // Avance automático: la barra de progreso del ítem activo marca el ritmo.
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-auto");
      el.addEventListener("animationend", (e) => {
        if (e.target.classList.contains("showcase__bar")) activate((current + 1) % list.length);
      });
      el.addEventListener("pointerenter", () => el.classList.add("is-paused"));
      el.addEventListener("pointerleave", () => el.classList.remove("is-paused"));
      el.addEventListener("focusin", () => el.classList.add("is-paused"));
      el.addEventListener("focusout", () => el.classList.remove("is-paused"));
      new IntersectionObserver(([e]) => el.classList.toggle("is-offscreen", !e.isIntersecting), { threshold: 0.25 }).observe(el);
    }
    activate(0);
  }

  function platformCard(p, i) {
    return `
      <article class="pcard" data-cat="${esc(p.categoria)}" data-reveal style="--d:${(i % 2) * 0.08}s">
        <a class="pcard__media browser" href="${esc(p.url)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
          ${browserBar(p)}
          <div class="browser__view"><img src="${esc(p.imagen)}" alt="" loading="lazy" decoding="async"></div>
        </a>
        <div class="pcard__body">
          <span class="pcard__num">${pad(i)} / ${esc(p.categoria)}</span>
          <h3><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.titulo)}</a></h3>
          <p class="pcard__proj mono">${esc(p.proyecto)}</p>
          <p>${esc(p.descripcion)}</p>
          <div class="chips">${p.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>
          <a class="link-arrow" href="${esc(p.url)}" target="_blank" rel="noopener">Abrir plataforma</a>
        </div>
      </article>`;
  }

  async function renderPlatforms() {
    const el = document.querySelector("[data-platforms]");
    if (!el) return;
    try {
      const list = await getJSON("plataformas");
      document.querySelectorAll("[data-platforms-count]").forEach((c) => (c.textContent = String(list.length).padStart(2, "0")));

      if (el.dataset.platforms === "showcase") {
        initShowcase(el, list);
        return done(el);
      }

      el.innerHTML = list.map(platformCard).join("");
      const filters = document.querySelector("[data-platforms-filters]");
      if (filters) {
        const cats = ["Todas", ...new Set(list.map((p) => p.categoria))];
        filters.innerHTML = cats
          .map((c, i) => `<button class="filter-btn" type="button" aria-pressed="${i === 0}" data-c="${esc(c)}">${esc(c)}</button>`)
          .join("");
        filters.addEventListener("click", (e) => {
          const b = e.target.closest("[data-c]");
          if (!b) return;
          filters.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          el.querySelectorAll(".pcard").forEach((card) => {
            card.hidden = b.dataset.c !== "Todas" && card.dataset.cat !== b.dataset.c;
          });
        });
      }
      done(el);
    } catch (e) {
      fail(el, "las plataformas");
    }
  }

  renderNews();
  renderPubs();
  renderTeam();
  renderPlatforms();
})();
