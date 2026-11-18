/* ═══════════════════════════════════════════════════════════
   PIRÉ HELADERÍAS — main.js
   Init general: scroll suavizado, progreso, menú, render de
   datos, animaciones de secciones y microinteracciones.
   ═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Puntero fino (mouse/trackpad): habilita cursor propio
  const punteroFino = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ── Scroll suavizado (Lenis) ── */
  let lenis = null;

  function initLenis() {
    if (reduce || typeof Lenis === "undefined") return;

    lenis = new Lenis({
      lerp: 0.1,          // suavidad
      smoothWheel: true,  // rueda de mouse suave
      syncTouch: false,   // en táctil usamos el scroll nativo (más fluido)
    });

    // Lenis necesita sincronizarse con el loop de GSAP
    if (typeof gsap !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      // Sin GSAP: loop propio con requestAnimationFrame
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }

  /* ── Barra de progreso del scroll ── */
  function initProgreso() {
    const barra = document.querySelector(".progreso-barra");
    const bocha = document.querySelector(".progreso-bocha");
    if (!barra) return;

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.to(barra, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.3,
        },
      });

      // La bolita del cucurucho viaja con el progreso
      if (bocha) {
        const mover = (self) => {
          const ancho = window.innerWidth - bocha.offsetWidth;
          const p = self && typeof self.progress === "number" ? self.progress : 0;
          bocha.style.transform = `translateX(${ancho * p}px)`;
        };
        ScrollTrigger.create({
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          onUpdate: mover,
          onRefresh: mover,
        });
      }
    } else {
      // Fallback sin GSAP
      window.addEventListener("scroll", () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? window.scrollY / max : 0;
        barra.style.transform = `scaleX(${p})`;
        if (bocha) {
          const ancho = window.innerWidth - bocha.offsetWidth;
          bocha.style.transform = `translateX(${ancho * p}px)`;
        }
      }, { passive: true });
    }
  }

  /* ── Menú hamburguesa (con manejo de foco en mobile) ── */
  function initMenu() {
    const btn = document.querySelector(".menu-btn");
    const nav = document.querySelector(".menu-nav");
    if (!btn || !nav) return;

    // ¿Es pantalla chica donde el menú se despliega?
    const esMobile = () => window.matchMedia("(max-width: 899px)").matches;

    // Saca el menú cerrado del orden de tabulación
    function inactivar(activo) {
      if (!esMobile()) return;
      if ("inert" in nav) {
        nav.inert = activo;
      } else {
        nav.setAttribute("aria-hidden", activo ? "true" : "false");
      }
    }

    function cerrar(volverFoco) {
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Abrir menú");
      nav.classList.remove("abierto");
      inactivar(true);
      if (volverFoco) btn.focus();
    }

    function abrir() {
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-label", "Cerrar menú");
      nav.classList.add("abierto");
      inactivar(false);
      const primero = nav.querySelector("a");
      if (primero) primero.focus();
    }

    btn.addEventListener("click", () => {
      const abierto = btn.getAttribute("aria-expanded") === "true";
      abierto ? cerrar(true) : abrir();
    });

    // Cerrar al tocar un link (mobile)
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => cerrar(false));
    });

    // Escape cierra el menú y devuelve el foco al botón
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
        cerrar(true);
      }
    });

    // Ajuste al cambiar de tamaño: en desktop el menú siempre está visible
    window.addEventListener("resize", () => {
      if (!esMobile()) {
        nav.classList.remove("abierto");
        btn.setAttribute("aria-expanded", "false");
        if ("inert" in nav) nav.inert = false;
        nav.removeAttribute("aria-hidden");
      } else {
        inactivar(nav.classList.contains("abierto") ? false : true);
      }
    });

    inactivar(true); // arranca cerrado en mobile
  }

  /* ── Anclas con scroll suave (si Lenis está activo) ── */
  function initAnclas() {
    if (!lenis) return;
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const destino = document.querySelector(a.getAttribute("href"));
        if (!destino || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        if (location.hash !== a.hash) history.pushState(null, "", a.hash);
        const header = document.querySelector(".header");
        lenis.resize();
        lenis.scrollTo(destino, { offset: -(header.offsetHeight + 12), immediate: true });
        destino.setAttribute("tabindex", "-1");
        destino.focus({ preventScroll: true });
      });
    });
  }

  /* ── Render de sabores (data/sabores.js) ──
     Cinco paneles rojos con la lista oficial de sabores.
     Desktop: grilla con todo abierto.
     Mobile: acordeón (un panel desplegable por categoría).
     Frutales y Livianos muestran subgrupos ("De agua" / "De crema"). */
  function initSabores() {
    const grilla = document.getElementById("grilla-sabores");
    if (!grilla || !window.SABORES) return;

    const cats = window.SABORES_CATEGORIAS || [];
    const esMobile = () => window.matchMedia("(max-width: 899px)").matches;

    const buscador = document.querySelector(".buscador-sabores");
    const campo = document.getElementById("buscar-sabor");
    const resultados = document.getElementById("resultados-sabores");
    const estado = document.getElementById("estado-busqueda");
    const normalizar = (texto) => texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    const nombres = new Map(cats.map((cat) => [cat.id, cat.nombre]));
    const indice = window.SABORES.map((sabor) => ({
      ...sabor,
      nombreCategoria: nombres.get(sabor.categoria),
      texto: normalizar(sabor.nombre),
    }));

    buscador.hidden = false;
    campo.addEventListener("input", () => {
      const consulta = normalizar(campo.value.trim());
      const coincidencias = consulta ? indice.filter((sabor) => sabor.texto.includes(consulta)) : [];
      resultados.replaceChildren(...coincidencias.map((sabor) => {
        const item = document.createElement("li");
        const nombre = document.createElement("strong");
        nombre.textContent = sabor.nombre;
        const categoria = document.createElement("span");
        categoria.textContent = sabor.nombreCategoria;
        item.append(nombre, categoria);
        return item;
      }));
      grilla.hidden = Boolean(consulta);
      resultados.hidden = !coincidencias.length;
      estado.textContent = !consulta ? "" : coincidencias.length
        ? `${coincidencias.length} ${coincidencias.length === 1 ? "sabor encontrado" : "sabores encontrados"}`
        : "No encontramos ese sabor. Probá con otro nombre.";
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh(true);
    });

    function listaUL(items) {
      const ul = document.createElement("ul");
      items.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s.nombre;
        ul.appendChild(li);
      });
      return ul;
    }

    cats.forEach((cat, idx) => {
      const items = window.SABORES.filter((s) => s.categoria === cat.id);
      if (!items.length) return;

      const panel = document.createElement("article");
      panel.className = "panel-sabor";

      // Título = botón del acordeón (en desktop no hace nada)
      const h3 = document.createElement("h3");
      h3.className = "panel-titulo";
      const btn = document.createElement("button");
      btn.className = "panel-btn";
      btn.type = "button";
      btn.setAttribute("aria-controls", "sabores-" + cat.id);
      const nombre = document.createElement("span");
      nombre.textContent = cat.nombre;
      btn.appendChild(nombre);
      h3.appendChild(btn);
      panel.appendChild(h3);

      // Lista (con subgrupos si la categoría los tiene)
      const idLista = "sabores-" + cat.id;
      const contenido = document.createElement("div");
      contenido.className = "panel-lista";
      contenido.id = idLista;

      if (cat.subgrupos && cat.subgrupos.length) {
        cat.subgrupos.forEach((sub) => {
          const subItems = items.filter((s) => s.subgrupo === sub.id);
          if (!subItems.length) return;
          const h4 = document.createElement("h4");
          h4.className = "panel-sub";
          h4.textContent = sub.nombre;
          contenido.appendChild(h4);
          contenido.appendChild(listaUL(subItems));
        });
      } else {
        contenido.appendChild(listaUL(items));
      }
      panel.appendChild(contenido);
      grilla.appendChild(panel);

      // Acordeón: solo en mobile; el primero arranca abierto.
      let abierto = idx === 0;
      const aplicar = () => {
        const visible = !esMobile() || abierto;
        panel.classList.toggle("abierto", visible);
        btn.setAttribute("aria-expanded", visible ? "true" : "false");
      };
      btn.addEventListener("click", () => {
        if (!esMobile()) return;
        abierto = !abierto;
        aplicar();
      });
      window.addEventListener("resize", aplicar);
      aplicar();
    });
  }

  /* ── Render de tortas y postres (data/tortas.js) ── */
  function initTortas() {
    if (!window.TORTAS) return;

    function tarjeta(item) {
      const el = document.createElement("article");
      el.className = "tarjeta";
      // Paleta de marca: el acento es siempre el rojo de Piré
      // (los colores por producto quedan en data/tortas.js por si se usan
      // en otro contexto, pero la UI se mantiene negro/blanco/rojo).
      el.style.setProperty("--tarjeta-color", "var(--rojo)");
      el.setAttribute("tabindex", "0"); // accesible por teclado
      el.innerHTML = `
        <div class="tarjeta-bolita" aria-hidden="true"></div>
        <h3></h3>
        <p></p>`;
      el.querySelector("h3").textContent = item.nombre;
      el.querySelector("p").textContent = item.descripcion;

      // Microinteracción: al tocar/focus se agranda
      el.addEventListener("pointerdown", () => el.classList.add("activa"));
      el.addEventListener("pointerup", () => el.classList.remove("activa"));
      el.addEventListener("pointercancel", () => el.classList.remove("activa"));
      el.addEventListener("pointerleave", () => el.classList.remove("activa"));
      el.addEventListener("blur", () => el.classList.remove("activa"));

      // Lo mismo con teclado (Enter / Espacio)
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          el.classList.add("activa");
        }
      });
      el.addEventListener("keyup", (e) => {
        if (e.key === "Enter" || e.key === " ") el.classList.remove("activa");
      });

      return el;
    }

    const grillaTortas = document.getElementById("grilla-tortas");
    const grillaPostres = document.getElementById("grilla-postres");

    if (grillaTortas) {
      window.TORTAS
        .filter((t) => t.categoria === "torta")
        .forEach((t) => grillaTortas.appendChild(tarjeta(t)));
    }
    if (grillaPostres) {
      window.TORTAS
        .filter((t) => t.categoria === "postre")
        .forEach((t) => grillaPostres.appendChild(tarjeta(t)));
    }
  }

  /* ── Año del footer ── */
  function initAnio() {
    const el = document.getElementById("anio");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ═════════════════════════════════════════════════════════
     ETAPA 2 · Animaciones de entrada de las secciones
     ═════════════════════════════════════════════════════════ */
  const hayGSAP = () => typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  /* Fade + slide de los elementos .reveal al entrar en pantalla.
     ScrollTrigger.batch los agrupa: los que entran juntos se animan
     escalonados. */
  function initReveals() {
    if (reduce || !hayGSAP()) return;

    const els = gsap.utils.toArray(".reveal");
    if (!els.length) return;

    gsap.set(els, { opacity: 0, y: 30 });

    ScrollTrigger.batch(els, {
      start: "top 88%",
      onEnter: (batch) => gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power2.out",
        overwrite: true,
        // Al terminar sacamos el transform inline para no pisar
        // los hover de CSS (ej: .tarjeta sube al pasar el mouse).
        clearProps: "transform",
      }),
    });
  }

  /* Parallax propio de las secciones que NO maneja etapa4.js. */
  function initParallax() {
    if (reduce || !hayGSAP()) return;

    const pares = [
      [".etiqueta", -18],
    ];

    pares.forEach(([sel, y]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      gsap.to(el, {
        y,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });
  }

  /* ═════════════════════════════════════════════════════════
     Estado "abierto ahora" (Delivery)
     Horarios: lunes a viernes 10:00 a 00:00;
               sábados y domingos 12:30 a 02:30.
     Usa la hora real de General Alvear (America/Argentina/Buenos_Aires).
     ═════════════════════════════════════════════════════════ */

  // Franjas de atención en "minutos desde el lunes 00:00".
  // Lunes = 0, martes = 1, … domingo = 6.
  const FRANJAS = [
    { ini: 0 * 1440 + 600, fin: 0 * 1440 + 1440 }, // lunes 10:00 → 00:00
    { ini: 1 * 1440 + 600, fin: 1 * 1440 + 1440 }, // martes
    { ini: 2 * 1440 + 600, fin: 2 * 1440 + 1440 }, // miércoles
    { ini: 3 * 1440 + 600, fin: 3 * 1440 + 1440 }, // jueves
    { ini: 4 * 1440 + 600, fin: 4 * 1440 + 1440 }, // viernes
    { ini: 5 * 1440 + 750, fin: 6 * 1440 + 150 },  // sábado 12:30 → domingo 02:30
    { ini: 6 * 1440 + 750, fin: 7 * 1440 + 150 },  // domingo 12:30 → lunes 02:30
  ];

  const DIAS = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const NOMBRES_DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

  // Hora actual en General Alvear como minutos desde el lunes 00:00
  function ahoraAlvear() {
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const valor = (tipo) => partes.find((p) => p.type === tipo).value;
    const dia = DIAS[valor("weekday")];
    let hora = parseInt(valor("hour"), 10);
    if (hora === 24) hora = 0; // algunos navegadores devuelven 24 a la medianoche
    const min = parseInt(valor("minute"), 10);

    return { dia, abs: dia * 1440 + hora * 60 + min };
  }

  // Se chequea también abs + 10080 (semana anterior) para capturar
  // el turno de sábado/domingo que cruza la medianoche.
  const estaAbierto = (abs) =>
    FRANJAS.some((f) => (abs >= f.ini && abs < f.fin) ||
                        (abs + 10080 >= f.ini && abs + 10080 < f.fin));

  // Primera apertura futura (se busca también en la semana siguiente)
  function proximaApertura(abs) {
    let mejor = null;
    FRANJAS.forEach((f) => {
      [0, 10080].forEach((offset) => {
        const ini = f.ini + offset;
        if (ini > abs && (mejor === null || ini < mejor)) mejor = ini;
      });
    });
    return mejor;
  }

  function textoApertura(abs) {
    const dia = NOMBRES_DIA[Math.floor(abs / 1440) % 7];
    const minDia = abs % 1440;
    const hh = String(Math.floor(minDia / 60)).padStart(2, "0");
    const mm = String(minDia % 60).padStart(2, "0");
    return `abrimos el ${dia} a las ${hh}:${mm}`;
  }

  function initDelivery() {
    const box = document.getElementById("estado-abierto");
    if (!box) return;

    function pintar() {
      const { dia, abs } = ahoraAlvear();
      const abierto = estaAbierto(abs);

      box.classList.toggle("abierto", abierto);
      box.classList.toggle("cerrado", !abierto);
      box.innerHTML = `
        <span class="estado-punto" aria-hidden="true"></span>
        <span class="estado-texto"></span>`;

      const texto = box.querySelector(".estado-texto");
      if (abierto) {
        texto.textContent = "Está abierto ahora";
      } else {
        const prox = proximaApertura(abs);
        texto.textContent = prox
          ? `Ahora está cerrado · ${textoApertura(prox)}`
          : "Ahora está cerrado";
      }

      // Resalta el renglón del día de hoy en la lista de horarios
      const hoyJS = new Date().getDay(); // 0 = domingo
      document.querySelectorAll(".horarios li[data-dias]").forEach((li) => {
        const dias = li.dataset.dias.split(",").map(Number);
        li.classList.toggle("hoy", dias.includes(hoyJS));
      });
    }

    pintar();
    // Se actualiza solo cada minuto
    setInterval(pintar, 60000);
  }

  /* ── Arranque ── */
  function init() {
    initLenis();

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      // En mobile, ignorar el resize del address bar (evita refrescos
      // que producen saltos y tirones durante el scroll).
      ScrollTrigger.config({ ignoreMobileResize: true });
    }

    initProgreso();
    initMenu();
    initAnclas();
    initSabores();
    initTortas();
    initAnio();
    initDelivery();

    // Escena del helado (define su propia lógica de reduced-motion)
    if (window.PireHelado) window.PireHelado.init();

    // Animaciones ligadas al scroll de las secciones
    initReveals();
    initParallax();

    // Refresh al cargar fuentes/fotos para que mida bien
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
