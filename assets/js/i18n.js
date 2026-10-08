/**
 * Idioma del sitio. El HTML está escrito en español; en inglés se reemplazan
 * los textos con el diccionario de assets/js/i18n-en.js (claves = HTML en
 * español con espacios normalizados). data.js y los demás scripts usan TA_t().
 */
(function () {
  const STORE = "ta-lang";
  const params = new URLSearchParams(location.search);
  let lang = "es";
  try {
    const q = params.get("lang");
    if (q === "en" || q === "es") localStorage.setItem(STORE, q);
    lang = localStorage.getItem(STORE) === "en" ? "en" : "es";
  } catch (e) {
    lang = params.get("lang") === "en" ? "en" : "es";
  }

  const DICT = window.TA_EN || {};
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  const t = (s) => (lang === "en" && DICT[norm(s)]) || s;
  window.TA_LANG = lang;
  window.TA_t = t;

  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|CANVAS|svg)$/;
  const INLINE = /^(A|B|STRONG|I|EM|SPAN|SMALL|BR|ABBR|TIME|SUP|SUB|MARK|U|Q|CITE|WBR|svg)$/;
  const hasWords = (s) => /[A-Za-zÁÉÍÓÚáéíóúÑñ]{2}/.test(s);
  const inlineOnly = (el) => [...el.children].every((c) => INLINE.test(c.tagName) && (c.tagName === "svg" || inlineOnly(c)));

  // Bloques mínimos de texto: elementos que solo contienen texto y etiquetas en línea.
  function collect(root, units, texts) {
    for (const node of root.childNodes) {
      if (node.nodeType === 3) {
        if (hasWords(node.textContent) && !inlineOnly(root)) texts.push(node);
        continue;
      }
      if (node.nodeType !== 1 || SKIP.test(node.tagName) || node.hasAttribute("data-i18n-skip")) continue;
      if (inlineOnly(node) && hasWords(node.textContent)) units.push(node);
      else collect(node, units, texts);
    }
  }

  function keyOf(el) {
    const c = el.cloneNode(true);
    [...c.children].forEach((x) => x.tagName === "svg" && x.remove());
    return norm(c.innerHTML);
  }

  const ATTRS = ["alt", "title", "aria-label", "placeholder"];

  function translate(root) {
    const units = [];
    const texts = [];
    collect(root, units, texts);
    units.forEach((el) => {
      const en = DICT[keyOf(el)];
      if (!en) return;
      const kids = [...el.childNodes];
      const firstReal = kids.findIndex((n) => !(n.nodeType === 1 && n.tagName === "svg") && n.textContent.trim());
      const lead = kids.filter((n, i) => n.nodeType === 1 && n.tagName === "svg" && i < firstReal);
      const tail = kids.filter((n, i) => n.nodeType === 1 && n.tagName === "svg" && i > firstReal);
      el.innerHTML = en;
      lead.reverse().forEach((s) => el.prepend(s));
      tail.forEach((s) => el.append(" ", s));
    });
    texts.forEach((n) => {
      const en = DICT[norm(n.textContent)];
      if (en) n.textContent = n.textContent.replace(/\S[\s\S]*\S|\S/, en);
    });
    root.querySelectorAll("[" + ATTRS.join("],[") + "]").forEach((el) =>
      ATTRS.forEach((a) => el.hasAttribute(a) && el.setAttribute(a, t(el.getAttribute(a))))
    );
  }

  window.TA_i18n = {
    lang,
    collect(root) {
      const units = [];
      const texts = [];
      collect(root, units, texts);
      const attrs = [];
      root.querySelectorAll("[" + ATTRS.join("],[") + "]").forEach((el) =>
        ATTRS.forEach((a) => el.hasAttribute(a) && hasWords(el.getAttribute(a)) && attrs.push(norm(el.getAttribute(a))))
      );
      return { units: units.map(keyOf), texts: texts.map((n) => norm(n.textContent)), attrs };
    },
  };

  if (lang === "en") {
    document.documentElement.lang = "en";
    document.title = t(document.title);
    document
      .querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"]')
      .forEach((m) => m.setAttribute("content", t(m.getAttribute("content"))));
    translate(document.body);
  }

  // Selector de idioma, en la esquina superior derecha de la cabecera.
  const cta = document.querySelector(".nav__cta");
  if (cta) {
    const sw = document.createElement("div");
    sw.className = "lang-switch";
    sw.setAttribute("role", "group");
    sw.setAttribute("aria-label", lang === "en" ? "Language" : "Idioma");
    sw.innerHTML = [
      ["es", "ES", "Ver en español"],
      ["en", "EN", "View in English"],
    ]
      .map(([k, l, title]) => `<button type="button" lang="${k}" data-lang="${k}" aria-pressed="${k === lang}" title="${title}">${l}</button>`)
      .join("");
    sw.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lang]");
      if (!b || b.dataset.lang === lang) return;
      try {
        localStorage.setItem(STORE, b.dataset.lang);
      } catch (err) {}
      const url = new URL(location.href);
      url.searchParams.set("lang", b.dataset.lang);
      location.href = url.toString();
    });
    cta.insertBefore(sw, cta.querySelector(".nav-toggle"));
  }

  document.documentElement.classList.remove("lang-pending");
})();
