/* ═══════════════════════════════════════════════════════════
   PIRÉ HELADERÍAS — etapa4.js
   Etapa 4 · Animaciones inmersivas (después del hero/story):
     · Separadores con marquee gigante que se inclina con la velocidad
     · Títulos revelados por letra
     · SABORES: paneles con translateZ+rotateX y tilt 3D con el mouse
     · TORTAS: carrusel horizontal pinned con rotateY por distancia
     · POSTRES: stacking cards sticky
     · DESAYUNO: parallax multicapa
     · CIFRAS: contadores count-up
     · DELIVERY: botón gigante rojo magnético + pulso
   Todo anima solo transform/opacity y se apaga en reduced-motion
   y en punteros táctiles.
   ═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Mouse/trackpad: habilita el tilt 3D y el botón magnético.
  const punteroFino = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const esMovil = () => window.matchMedia("(max-width: 899px)").matches;

  const hayGSAP = () =>
    typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  /* ───────────────────────────────────────────────────────────
     1) SEPARADORES · MARQUEE que se inclina con la velocidad
     ─────────────────────────────────────────────────────────── */
  function initMarquees() {
    // El contenido se arma SIEMPRE (también en estático): si no, el
    // separador queda como una franja roja vacía.
    const contenedores = gsap.utils.toArray("[data-marquee]");

    contenedores.forEach((cont) => {
      const texto = cont.getAttribute("data-marquee") || "";
      if (!texto) return;

      // Duplicamos el texto lo suficiente para llenar y poder desplazarlo.
      // Dos capas: el wrapper recibe el skew y la fila se mueve en loop,
      // así los dos tweens nunca pelean por la misma propiedad.
      const repeticiones = 6;
      const wrapper = document.createElement("div");
      wrapper.className = "marquee-fila";

      const fila = document.createElement("div");
      fila.className = "marquee-pista";
      fila.style.display = "flex";
      fila.style.width = "max-content";
      for (let i = 0; i < repeticiones; i++) {
        const s = document.createElement("span");
        s.textContent = texto;
        fila.appendChild(s);
      }
      wrapper.appendChild(fila);
      cont.appendChild(wrapper);
      cont.classList.add("marquee");
    });

    // En estático (reduced-motion) o en mobile queda quieto: el CSS ya lo
    // muestra centrado y sin animación.
    if (reduce || !hayGSAP() || esMovil()) return;

    const reposar = [];
    // Un único listener: cuando el scroll se frena, todos los separadores
    // vuelven a su posición recta.
    ScrollTrigger.addEventListener("scrollEnd", () => reposar.forEach((f) => f()));

    contenedores.forEach((cont) => {
      const fila = cont.querySelector(".marquee-pista");
      const wrapper = cont.querySelector(".marquee-fila");
      if (!fila || !wrapper) return;
      const repeticiones = 6;

      // Desplazamiento continuo (loop) — sin depender del scroll.
      const tween = gsap.to(fila, {
        xPercent: -100 / repeticiones,
        duration: 18,
        ease: "none",
        repeat: -1,
      });

      // Skew según la VELOCIDAD del scroll. Un ticker propio interpola el
      // valor hacia el objetivo en cada frame y, si no hubo scroll en los
      // últimos frames, el objetivo cae a 0 (se endereza solo).
      let velObjetivo = 0;
      let velSuave = 0;
      let ultimoUpdate = 0;
      const tick = () => {
        // ~9 frames sin novedades => se considera detenido.
        if (gsap.ticker.frame - ultimoUpdate > 9) velObjetivo = 0;
        velSuave += (velObjetivo - velSuave) * 0.12;
        gsap.set(wrapper, { skewX: gsap.utils.clamp(-14, 14, velSuave) });
      };
      gsap.ticker.add(tick);

      ScrollTrigger.create({
        trigger: cont,
        start: "top bottom",
        end: "bottom top",
        onUpdate(self) {
          const vel = self.getVelocity();
          velObjetivo = vel / -220;
          ultimoUpdate = gsap.ticker.frame;
          // La velocidad también acelera el loop.
          tween.timeScale(gsap.utils.clamp(0.4, 3, Math.abs(vel) / 700 + 1));
        },
        onLeave: () => { velObjetivo = 0; },
        onLeaveBack: () => { velObjetivo = 0; },
      });

      // Si el scroll se detiene, el objetivo vuelve a 0 (se endereza solo).
      reposar.push(() => { velObjetivo = 0; });
    });
  }

  /* ───────────────────────────────────────────────────────────
     2) TÍTULOS revelados por letra (o por línea)
     ─────────────────────────────────────────────────────────── */
  function initTitulos() {
    if (reduce || !hayGSAP()) return;

    gsap.utils.toArray(".titulo-anim").forEach((h) => {
      // Partimos el texto en <span> sin romper palabras (por eso por palabra
      // + letra: mantenemos el texto original para lectores de pantalla).
      const original = h.textContent.trim();
      h.setAttribute("aria-label", original);

      const palabras = original.split(/\s+/);
      const letras = [];
      h.textContent = "";
      palabras.forEach((palabra, pi) => {
        const env = document.createElement("span");
        env.className = "palabra";
        env.style.display = "inline-block";
        env.setAttribute("aria-hidden", "true");
        [...palabra].forEach((ch) => {
          const s = document.createElement("span");
          s.className = "letra";
          s.textContent = ch;
          env.appendChild(s);
          letras.push(s);
        });
        h.appendChild(env);
        if (pi < palabras.length - 1) h.appendChild(document.createTextNode(" "));
      });

      gsap.from(letras, {
        opacity: 0,
        yPercent: 60,
        rotateX: -80,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.02,
        scrollTrigger: { trigger: h, start: "top 85%" },
      });
    });
  }

  /* ───────────────────────────────────────────────────────────
     3) SABORES · paneles entran con translateZ + rotateX
        y (desktop) tilt 3D con el mouse.
     ─────────────────────────────────────────────────────────── */
  function initSabores3D() {
    if (reduce || !hayGSAP()) return;

    const paneles = gsap.utils.toArray(".panel-sabor");
    if (!paneles.length) return;

    gsap.from(paneles, {
      opacity: 0,
      z: -220,
      rotateX: 26,
      y: 60,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.12,
      scrollTrigger: { trigger: "#grilla-sabores", start: "top 82%" },
    });

    if (!punteroFino || esMovil()) return;

    // Tilt 3D siguiendo el mouse dentro de cada panel.
    paneles.forEach((panel) => {
      const rx = gsap.quickTo(panel, "rotationX", { duration: 0.5, ease: "power3" });
      const ry = gsap.quickTo(panel, "rotationY", { duration: 0.5, ease: "power3" });
      const ty = gsap.quickTo(panel, "y", { duration: 0.5, ease: "power3" });
      panel.style.transformStyle = "preserve-3d";

      panel.addEventListener("pointermove", (e) => {
        const r = panel.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rx(-py * 12);
        ry(px * 14);
        ty(-8);
        panel.classList.add("señalado");
      });
      panel.addEventListener("pointerleave", () => {
        rx(0); ry(0); ty(0);
        panel.classList.remove("señalado");
      });
    });
  }

  /* ───────────────────────────────────────────────────────────
     4) TORTAS · carrusel horizontal pinned (solo desktop)
        Cada tarjeta rota en Y según su distancia al centro.
     ─────────────────────────────────────────────────────────── */
  function initCarruselTortas() {
    if (reduce || !hayGSAP()) return;
    if (esMovil()) return; // en mobile queda la lista vertical

    const pista = document.getElementById("grilla-tortas");
    const seccion = document.getElementById("tortas");
    if (!pista || !seccion) return;

    const tarjetas = gsap.utils.toArray(pista.children);
    if (!tarjetas.length) return;

    // Cuánto hay que desplazar la pista para que la última tarjeta
    // termine pegada al borde derecho de la pantalla.
    const desplazamiento = () =>
      Math.max(0, pista.scrollWidth - window.innerWidth);

    // El alto de la sección = viewport + recorrido: así el tramo pinned dura
    // exactamente lo que dura el desplazamiento y no queda scroll muerto.
    const ajustarAlto = () => {
      const rec = desplazamiento();
      seccion.style.height = `${window.innerHeight + rec}px`;
    };
    ajustarAlto();

    gsap.set(pista, { transformPerspective: 1200 });

    // Un único ScrollTrigger mueve la pista y, en el mismo cálculo, inclina
    // cada tarjeta según su distancia al centro del viewport. Así no hay
    // tweens peleándose por la misma propiedad.
    const centro = () => window.innerWidth / 2;

    ScrollTrigger.create({
      trigger: seccion,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      invalidateOnRefresh: true,
      onRefresh: ajustarAlto,
      onUpdate(self) {
        const x = -desplazamiento() * self.progress;
        gsap.set(pista, { x });
        const cx = centro();
        tarjetas.forEach((t) => {
          const c = t.offsetLeft + t.offsetWidth / 2 + x;
          const d = gsap.utils.clamp(0, 1, Math.abs(c - cx) / cx);
          // La tarjeta que queda a la izquierda se abre hacia un lado y la
          // que queda a la derecha hacia el otro (efecto de vitrina).
          const lado = c < cx ? 1 : -1;
          gsap.set(t, {
            rotateY: d * 24 * lado,
            scale: 1 - d * 0.07,
            z: -d * 60,
          });
        });
      },
    });
  }

  /* ───────────────────────────────────────────────────────────
     5) POSTRES · stacking cards sticky (solo desktop)
     ─────────────────────────────────────────────────────────── */
  function initPostresStack() {
    if (reduce || !hayGSAP()) return;

    const seccion = document.getElementById("postres");
    const stack = document.getElementById("grilla-postres");
    if (!seccion || !stack) return;

    const tarjetas = gsap.utils.toArray(stack.children);
    if (tarjetas.length < 1) return;

    seccion.style.height = "auto";

    if (esMovil()) {
      gsap.from(tarjetas, {
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: stack,
          start: "top 90%",
        },
      });
      return;
    }

    // Entrada cinematográfica: cada tarjeta entra con un leve giro y
    // desplazamiento desde abajo, con stagger orgánico como el resto del sitio.
    gsap.set(tarjetas, { transformPerspective: 900, transformOrigin: "50% 100%" });

    gsap.from(tarjetas, {
      opacity: 0,
      y: 70,
      rotateX: -14,
      scale: 0.96,
      duration: 0.9,
      ease: "power3.out",
      stagger: {
        each: 0.09,
        from: "start",
      },
      scrollTrigger: {
        trigger: stack,
        start: "top 85%",
      },
    });
  }

  /* ───────────────────────────────────────────────────────────
     6) DESAYUNO · parallax multicapa
     ─────────────────────────────────────────────────────────── */
  function initParallaxDesayuno() {
    if (reduce || !hayGSAP()) return;

    const capas = gsap.utils.toArray("[data-capa]");
    if (!capas.length) return;

    capas.forEach((el) => {
      const n = Number(el.getAttribute("data-capa")) || 1;
      // Cada capa viaja a distinta velocidad y arranca un poco más abajo
      // cuanto más "cerca" está (n mayor = más movimiento).
      gsap.fromTo(el,
        { y: 60 + n * 34, rotateX: 8 - n * 2.5, opacity: 0.35 },
        {
          y: -50 - n * 30, rotateX: 0, opacity: 1, ease: "none",
          scrollTrigger: {
            trigger: ".fotos-desayuno",
            start: "top 92%",
            end: "bottom 15%",
            scrub: true,
          },
        });
    });
  }

  /* ───────────────────────────────────────────────────────────
     7) CIFRAS · contadores count-up
     ─────────────────────────────────────────────────────────── */
  function initContadores() {
    const numeros = document.querySelectorAll("[data-contar]");
    if (!numeros.length) return;

    const pintar = (el, valor) => {
      const pref = el.getAttribute("data-prefijo") || "";
      el.textContent = pref + Math.round(valor);
    };

    // Con reduced-motion (o sin GSAP) mostramos el valor final directo.
    if (reduce || !hayGSAP()) {
      numeros.forEach((el) => pintar(el, Number(el.getAttribute("data-contar"))));
      return;
    }

    numeros.forEach((el) => {
      const destino = Number(el.getAttribute("data-contar")) || 0;
      const obj = { v: 0 };
      pintar(el, 0);
      gsap.to(obj, {
        v: destino,
        duration: 1.6,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
        onUpdate() { pintar(el, obj.v); },
        onComplete() { pintar(el, destino); },
      });
    });
  }

  /* ───────────────────────────────────────────────────────────
     8) DELIVERY · botón gigante rojo magnético + pulso
     ─────────────────────────────────────────────────────────── */
  function initBotonMagnetico() {
    const btn = document.getElementById("btn-pedir-grande");
    if (!btn) return;

    // Pulso: solo si el local está abierto ahora.
    const estado = document.getElementById("estado-abierto");
    const syncPulso = () => {
      if (estado && estado.classList.contains("abierto")) btn.classList.add("pulso");
      else btn.classList.remove("pulso");
    };
    syncPulso();
    if (estado) {
      new MutationObserver(syncPulso).observe(estado, {
        attributes: true, attributeFilter: ["class"],
      });
    }

    if (reduce || !punteroFino || esMovil()) return;

    // Efecto magnético: el botón sigue levemente al cursor.
    const mover = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3" });
    const moverY = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3" });
    const zona = btn.parentElement || btn;

    zona.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / (r.width / 2);
      const dy = (e.clientY - cy) / (r.height / 2);
      mover(gsap.utils.clamp(-1, 1, dx) * 22);
      moverY(gsap.utils.clamp(-1, 1, dy) * 14);
    });
    zona.addEventListener("pointerleave", () => { mover(0); moverY(0); });
  }

  /* ── Arranque ── */
  function init() {
    initMarquees();
    initTitulos();
    initSabores3D();
    initCarruselTortas();
    initPostresStack();
    initParallaxDesayuno();
    initContadores();
    initBotonMagnetico();

    // Las secciones pinned ajustan su alto cuando el carrusel/stack ya
    // conocen su contenido; acá solo aseguramos un refresh.
    if (hayGSAP()) ScrollTrigger.refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.PireEtapa4 = { init };
})();
