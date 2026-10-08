/**
 * Renderiza noticias, publicaciones y equipo desde /data/*.json.
 * Para actualizar contenidos basta con editar esos archivos.
 */
(function () {
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  const LAB_AUTHORS = /(Freddy(\s+A\.|\s+Alejandro)?\s+Saavedra(\s+Pimentel)?|F\.\s*Saavedra|Marcelo\s+Legu[ií]a([\s-]Cruz)?|Ana\s+Hern[aá]ndez([\s-]Duarte)?|Hern[aá]ndez-Duarte|Carlos(\s+Eduardo)?\s+Romero|Valentina(\s+Ignacia)?\s+Contreras(\s+Figueroa)?|Javier\s+Medina(\s+Mendoza)?|Pablo\s+Arancibia|Yael\s+Aguirre|Daniela\s+Gonz[aá]lez)/g;

  const PUBLISHERS = {
    "10.1002/joc": "Int. Journal of Climatology",
    "10.1002/2017WR": "Water Resources Research",
    "10.1002/essoar": "ESS Open Archive",
    "10.1016/j.jenvman": "J. Environmental Management",
    "10.5194/egusphere": "EGUsphere",
    "10.5194/tc": "The Cryosphere",
    "10.5194/os": "Ocean Science",
    "10.5194/essd": "Earth System Science Data",
    "10.3389/feart": "Frontiers in Earth Science",
    "10.3389/fenvs": "Frontiers in Environmental Science",
    "10.1016/j.apgeog": "Applied Geography",
    "10.1016/j.cosust": "Current Opinion in Environmental Sustainability",
    "10.3390/fire": "Fire · MDPI",
    "10.3390/rs": "Remote Sensing · MDPI",
    "10.20944/preprints": "Preprints.org",
    "10.48162": "Boletín de Estudios Geográficos",
    "10.15359": "Uniciencia",
    "revistas.ubiobio.cl": "Revista Urbano · UBB",
  };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const EN = window.TA_LANG === "en";
  const t = window.TA_t || ((s) => s);
  // Campo traducido si existe (p. ej. titulo_en), si no el original.
  const L = (o, k) => (EN && o[k + "_en"]) || o[k];

  const fmtDate = (iso) => {
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? "" : d.toLocaleDateString(EN ? "en-GB" : "es-CL", { year: "numeric", month: "short", day: "numeric" });
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

  const TONES = {
    Nieve: "nieve",
    Océanos: "nieve",
    "Nieve y agua": "nieve",
    Incendios: "fuego",
    Ciudades: "ciudad",
    Vegetación: "vegetacion",
    Drones: "dron",
    Glaciares: "nieve",
    Territorio: "ciudad",
    Biodiversidad: "vegetacion",
  };
  const toneAttr = (k) => (TONES[k] ? ` data-tone="${TONES[k]}"` : "");

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
    el.innerHTML = EN
      ? `<p class="empty">Could not load ${what}. If you are opening the site straight from disk, use a local server (see README).</p>`
      : `<p class="empty">No fue posible cargar ${what}. Si abres el sitio directamente desde el disco, usa un servidor local (ver README).</p>`;
  }

  // ---------- Noticias ----------
  function newsCard(n, i) {
    return `
      <a class="news-card" href="${esc(n.url)}" target="_blank" rel="noopener" data-reveal style="--d:${(i % 3) * 0.08}s">
        <div class="news-card__img"><img src="${esc(n.imagen)}" alt="" loading="lazy" decoding="async"></div>
        <div class="news-card__meta"><span class="tag"${toneAttr(topicOf(n))}>${esc(t(topicOf(n)))}</span><time datetime="${esc(n.fecha)}">${fmtDate(n.fecha)}</time></div>
        <h3>${esc(L(n, "titulo"))}</h3>
        <p>${esc(L(n, "subtitulo"))}</p>
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
        .map((k) => `<button class="filter-btn" type="button" aria-pressed="${k === topic}" data-topic="${esc(k)}">${esc(t(k))}</button>`)
        .join("");

      const draw = () => {
        const q = (search.value || "").toLowerCase().trim();
        const list = all.filter(
          (n) =>
            (topic === "Todas" || topicOf(n) === topic) &&
            (!q || [n.titulo, n.subtitulo, n.titulo_en, n.subtitulo_en].join(" ").toLowerCase().includes(q))
        );
        el.innerHTML = list.length ? list.slice(0, shown).map(newsCard).join("") : `<p class="empty">${t("Sin resultados.")}</p>`;
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
      fail(el, EN ? "the news" : "las noticias");
    }
  }

  // ---------- Publicaciones ----------
  const OPEN_ACCESS = ["10.5194", "10.3389", "10.3390", "10.20944", "10.48162", "10.15359", "10.1002/essoar", "revistas.ubiobio"];
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';

  function authorsHTML(a) {
    return esc(a).replace(LAB_AUTHORS, (m) => `<b>${m}</b>`);
  }

  function shortAuthors(a, max) {
    const list = a.split(/,\s*/);
    if (list.length <= max + 1) return authorsHTML(a);
    return `${authorsHTML(list.slice(0, max - 1).join(", "))} … ${authorsHTML(list[list.length - 1])} <span class="paper__more">+${list.length - max} ${list.length - max === 1 ? (EN ? "author" : "autor") : EN ? "authors" : "autores"}</span>`;
  }

  function pubTopic(p) {
    const t = (p.Titulo?.en + " " + p.Titulo?.es).toLowerCase();
    if (/incendi|fire|wildfire|combustible|erosi/.test(t)) return "Incendios";
    if (/glaciar|glacier/.test(t)) return "Glaciares";
    if (/pluma|plume|océan|ocean/.test(t)) return "Océanos";
    if (/remoción|periurban|planificación|biosfera|biosphere|urban/.test(t)) return "Territorio";
    return "Nieve";
  }

  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

  function citation(p) {
    return `${p.Autor} (${p.Año}). ${p.Titulo?.en || p.Titulo?.es}. ${publisherOf(p.DOI)}. ${p.DOI}`;
  }

  function paperHTML(p, compact) {
    const title = EN ? p.Titulo?.en || p.Titulo?.es || "" : p.Titulo?.es || p.Titulo?.en || "";
    const abstract = EN ? p.Extracto?.en || p.Extracto?.es || "" : p.Extracto?.es || p.Extracto?.en || "";
    const topic = pubTopic(p);
    const journal = publisherOf(p.DOI);
    const oa = OPEN_ACCESS.some((k) => p.DOI.includes(k));
    const id = "pub-" + esc(p.ID);
    const a = p.Audio;
    const first = a ? esc(a.voz.split(" ")[0]) : "";
    const voice = a && (a.sintetica ? (EN ? "synthetic voice, in Spanish" : "voz sintetizada") : EN ? "in Spanish" : "en su voz");
    const listen = a
      ? `<button class="listen" type="button" data-audio="${esc(a.src)}" data-dur="${a.duracion || 0}" aria-label="${EN ? `Listen to a summary narrated by ${esc(a.voz)}, in Spanish` : `Escuchar resumen narrado por ${esc(a.voz)}`} (${mmss(a.duracion || 0)})">
          <span class="listen__icon">${PLAY}</span>
          <span class="listen__txt"><b>${EN ? "Listen to" : "Escuchar a"} ${first}</b><small><span data-time>${mmss(a.duracion || 0)}</span> · ${voice}</small></span>
          <span class="listen__bar" aria-hidden="true"><i></i></span>
        </button>`
      : "";
    const note = a && a.sintetica
      ? EN
        ? `Narrated in Spanish with a synthetic voice from a first-person script. It will be replaced by ${esc(a.voz)}'s own recording.`
        : `Narración con voz sintetizada a partir de un guion en primera persona. Será reemplazada por la grabación de ${esc(a.voz)}.`
      : "";
    const panels = compact
      ? ""
      : `<div class="paper__panel" id="${id}-abs" hidden><h4>${t("Resumen científico")}</h4><p${EN ? ' lang="en"' : ""}>${esc(abstract)}</p></div>
         ${a ? `<div class="paper__panel" id="${id}-tr" hidden><h4>${EN ? "Audio transcript (English translation)" : "Transcripción del audio"}</h4><p>${esc(L(a, "transcripcion"))}</p>${note ? `<p class="paper__note">${note}</p>` : ""}</div>` : ""}`;
    const tools = compact
      ? ""
      : `<button class="paper__tool" type="button" aria-expanded="false" aria-controls="${id}-abs" data-panel>${t("Resumen científico")}</button>
         ${a ? `<button class="paper__tool" type="button" aria-expanded="false" aria-controls="${id}-tr" data-panel>${t("Transcripción")}</button>` : ""}
         <button class="paper__tool" type="button" data-cite="${esc(citation(p))}">${t("Citar")}</button>`;
    return `
      <article class="paper${compact ? " paper--compact" : ""}" data-topic="${esc(topic)}"${toneAttr(topic)} data-reveal>
        <div class="paper__main">
          <p class="paper__kicker">
            <span class="paper__topic">${esc(t(topic))}</span>
            <span>${esc(t(p.Tipo || "Artículo"))}</span>
            ${p.Preprint ? '<span class="paper__badge">Preprint</span>' : ""}
            ${oa ? `<span class="paper__oa">${t("Acceso abierto")}</span>` : ""}
            <time${p.Fecha ? ` datetime="${esc(p.Fecha)}"` : ""}>${p.Fecha ? fmtDate(p.Fecha) : esc(p.Año)}</time>
          </p>
          <h3 class="paper__title"><a href="${esc(p.DOI)}" target="_blank" rel="noopener">${esc(title)}</a></h3>
          ${!compact && !EN && p.Titulo?.en ? `<p class="paper__orig" lang="en">${esc(p.Titulo.en)}</p>` : ""}
          ${p.Divulgacion ? `<p class="paper__stand">${esc(L(p, "Divulgacion"))}</p>` : ""}
          <p class="paper__authors">${shortAuthors(p.Autor, compact ? 4 : 7)}</p>
          <p class="paper__source"><i>${esc(journal)}</i>${p.Estado ? ` · ${esc(t(p.Estado))}` : ""}</p>
          <div class="paper__actions">
            ${listen}
            ${tools}
            <a class="paper__tool paper__tool--go" href="${esc(p.DOI)}" target="_blank" rel="noopener">${t("Leer artículo")} ${ARROW}</a>
          </div>
          ${panels}
        </div>
        <a class="paper__fig" href="${esc(p.DOI)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
          <img src="${esc(p.Image)}" alt="" loading="lazy" decoding="async">
        </a>
      </article>`;
  }

  // Un solo reproductor para todos los resúmenes en audio.
  const player = new Audio();
  player.preload = "none";
  let playing = null;

  function setListen(btn, state, t) {
    if (!btn) return;
    btn.classList.toggle("is-playing", state === "play");
    btn.classList.toggle("is-started", state !== "stop");
    btn.querySelector(".listen__icon").innerHTML = state === "play" ? PAUSE : PLAY;
    const dur = player.duration || +btn.dataset.dur || 0;
    btn.querySelector("[data-time]").textContent = state === "stop" ? mmss(+btn.dataset.dur) : `${mmss(t || 0)} / ${mmss(dur)}`;
    btn.style.setProperty("--p", state === "stop" ? 0 : dur ? (t || 0) / dur : 0);
  }

  player.addEventListener("timeupdate", () => setListen(playing, player.paused ? "pause" : "play", player.currentTime));
  player.addEventListener("ended", () => {
    setListen(playing, "stop");
    playing = null;
  });

  function bindPapers(root) {
    root.addEventListener("click", (e) => {
      const listen = e.target.closest("[data-audio]");
      if (listen) {
        if (playing === listen) {
          if (player.paused) player.play();
          else player.pause();
          setListen(listen, player.paused ? "pause" : "play", player.currentTime);
          return;
        }
        setListen(playing, "stop");
        playing = listen;
        player.src = listen.dataset.audio;
        player.play();
        setListen(listen, "play", 0);
        return;
      }
      const panel = e.target.closest("[data-panel]");
      if (panel) {
        const paper = panel.closest(".paper");
        paper.querySelectorAll("[data-panel]").forEach((b) => {
          const open = b === panel && b.getAttribute("aria-expanded") !== "true";
          b.setAttribute("aria-expanded", String(open));
          document.getElementById(b.getAttribute("aria-controls")).hidden = !open;
        });
        return;
      }
      const cite = e.target.closest("[data-cite]");
      if (cite && navigator.clipboard) {
        navigator.clipboard.writeText(cite.dataset.cite).then(() => {
          cite.textContent = t("Cita copiada");
          setTimeout(() => (cite.textContent = t("Citar")), 1800);
        });
      }
    });
  }

  async function renderPubs() {
    const el = document.querySelector("[data-pubs]");
    if (!el) return;
    try {
      const all = (await getJSON("publications"))
        .slice()
        .sort((a, b) => b.Año - a.Año || String(b.Fecha || "").localeCompare(String(a.Fecha || "")) || b.ID - a.ID);
      document.querySelectorAll("[data-pubs-count]").forEach((c) => {
        c.dataset.count = all.length;
        c.textContent = all.length;
      });
      window.TA_observeCounters && window.TA_observeCounters();
      bindPapers(el);

      const limit = parseInt(el.dataset.pubs, 10);
      if (limit) {
        el.innerHTML = all.slice(0, limit).map((p) => paperHTML(p, true)).join("");
        return done(el);
      }

      const search = document.querySelector("[data-pubs-search]");
      const filters = document.querySelector("[data-pubs-filters]");
      const topics = ["Todas", ...new Set(all.map(pubTopic))];
      if (all.some((p) => !p.Audio)) topics.push("Con audio");
      let topic = "Todas";

      filters.innerHTML = topics
        .map((k) => `<button class="filter-btn" type="button" aria-pressed="${k === topic}" data-t="${esc(k)}"${toneAttr(k)}>${esc(t(k))}</button>`)
        .join("");

      const draw = () => {
        const q = (search.value || "").toLowerCase().trim();
        const list = all.filter((p) => {
          const hay = [p.Titulo?.es, p.Titulo?.en, p.Autor, p.Divulgacion, p.Divulgacion_en, p.Extracto?.es, EN && p.Extracto?.en, t(pubTopic(p))]
            .join(" ")
            .toLowerCase();
          const ok = topic === "Todas" || (topic === "Con audio" ? !!p.Audio : pubTopic(p) === topic);
          return ok && (!q || hay.includes(q));
        });
        if (playing && !el.contains(playing)) playing = null;
        const years = [...new Set(list.map((p) => p.Año))];
        el.innerHTML = list.length
          ? years
              .map((y) => {
                const items = list.filter((p) => p.Año === y);
                return `<section class="paper-year"><h2 class="paper-year__head"><span>${y}</span><small>${items.length} ${items.length === 1 ? t("publicación") : t("publicaciones")}</small></h2>${items.map((p) => paperHTML(p, false)).join("")}</section>`;
              })
              .join("")
          : `<p class="empty">${t("Sin resultados.")}</p>`;
        done(el);
      };

      filters.addEventListener("click", (e) => {
        const b = e.target.closest("[data-t]");
        if (!b) return;
        topic = b.dataset.t;
        filters.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        draw();
      });
      search.addEventListener("input", draw);
      draw();
    } catch (e) {
      fail(el, EN ? "the publications" : "las publicaciones");
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
      ? `<img src="${esc(m.foto)}" alt="${EN ? "Portrait of" : "Retrato de"} ${esc(m.nombre)}" loading="lazy" decoding="async">`
      : `<span class="member__initials">${esc(initials(m.nombre))}</span>`;
    return `
      <article class="member" data-group="${esc(m.grupo || "antiguos")}" data-reveal style="--d:${(i % 4) * 0.07}s">
        <div class="member__photo">${photo}</div>
        ${m.rol ? `<span class="member__role">${esc(t(m.rol))}</span>` : ""}
        <h3>${esc(m.nombre)}</h3>
        <p>${esc(L(m, "bio"))}</p>
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
        ["todos", "Todo el equipo", "Whole team"],
        ["direccion", "Dirección", "Leadership"],
        ["investigacion", "Investigación", "Research"],
        ["comunicaciones", "Comunicaciones", "Communications"],
      ];
      filters.innerHTML = groups
        .map(([k, es, en], i) => `<button class="filter-btn" type="button" aria-pressed="${i === 0}" data-g="${k}">${EN ? en : es}</button>`)
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
      fail(el, EN ? "the team" : "el equipo");
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
          <a class="showcase__item" href="${esc(p.url)}" target="_blank" rel="noopener" data-i="${i}"${toneAttr(p.categoria)}>
            <span class="showcase__num">${pad(i)}</span>
            <span class="showcase__title">${esc(L(p, "titulo"))}<small>${esc(t(p.categoria))} · ${esc(t(p.proyecto))}</small></span>
            <span class="showcase__go">${ARROW}</span>
            <span class="showcase__bar" aria-hidden="true"></span>
            <span class="showcase__mobile">
              <img src="${esc(p.imagen)}" alt="" loading="lazy" decoding="async">
              <span>${esc(L(p, "descripcion"))}</span>
            </span>
          </a>
        </li>`
      )
      .join("");
    const shots = list
      .map((p, i) => `<img src="${esc(p.imagen)}" alt="${EN ? "View of" : "Vista de"} ${esc(L(p, "titulo"))}" loading="lazy" decoding="async" data-shot="${i}">`)
      .join("");
    return `
      <ol class="showcase__list">${items}</ol>
      <div class="showcase__stage">
        <div class="browser">
          <div class="browser__bar"><i></i><i></i><i></i><span class="browser__url" data-sc-url></span><span class="browser__live">${t("En línea")}</span></div>
          <div class="browser__view">${shots}<span class="browser__scan" aria-hidden="true"></span><span class="browser__idx mono" data-sc-idx></span></div>
        </div>
        <div class="showcase__info">
          <div class="showcase__meta"><span class="tag" data-sc-cat></span><span class="mono" data-sc-proj></span></div>
          <p data-sc-desc></p>
          <div class="chips" data-sc-chips></div>
          <a class="btn btn--primary" data-sc-link href="#" target="_blank" rel="noopener">${t("Abrir plataforma")} ${ARROW}</a>
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
      $("[data-sc-cat]").textContent = t(p.categoria);
      $(".showcase__info").dataset.tone = TONES[p.categoria] || "";
      $("[data-sc-proj]").textContent = t(p.proyecto);
      $("[data-sc-desc]").textContent = L(p, "descripcion");
      $("[data-sc-chips]").innerHTML = p.chips.map((c) => `<span class="chip">${esc(t(c))}</span>`).join("");
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
      <article class="pcard" data-cat="${esc(p.categoria)}"${toneAttr(p.categoria)} data-reveal style="--d:${(i % 2) * 0.08}s">
        <a class="pcard__media browser" href="${esc(p.url)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
          ${browserBar(p)}
          <div class="browser__view"><img src="${esc(p.imagen)}" alt="" loading="lazy" decoding="async"></div>
        </a>
        <div class="pcard__body">
          <span class="pcard__num">${pad(i)} / ${esc(t(p.categoria))}</span>
          <h3><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(L(p, "titulo"))}</a></h3>
          <p class="pcard__proj mono">${esc(t(p.proyecto))}</p>
          <p>${esc(L(p, "descripcion"))}</p>
          <div class="chips">${p.chips.map((c) => `<span class="chip">${esc(t(c))}</span>`).join("")}</div>
          <a class="link-arrow" href="${esc(p.url)}" target="_blank" rel="noopener">${t("Abrir plataforma")}</a>
        </div>
      </article>`;
  }

  async function renderPlatforms() {
    const el = document.querySelector("[data-platforms]");
    if (!el) return;
    try {
      const list = await getJSON("plataformas");
      document.querySelectorAll("[data-platforms-count]").forEach((c) => (c.textContent = String(list.length)));

      if (el.dataset.platforms === "showcase") {
        initShowcase(el, list);
        return done(el);
      }

      el.innerHTML = list.map(platformCard).join("");
      const filters = document.querySelector("[data-platforms-filters]");
      if (filters) {
        const cats = ["Todas", ...new Set(list.map((p) => p.categoria))];
        filters.innerHTML = cats
          .map((c, i) => `<button class="filter-btn" type="button" aria-pressed="${i === 0}" data-c="${esc(c)}">${esc(t(c))}</button>`)
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
      fail(el, EN ? "the platforms" : "las plataformas");
    }
  }

  renderNews();
  renderPubs();
  renderTeam();
  renderPlatforms();
})();
