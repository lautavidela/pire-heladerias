/* ═══════════════════════════════════════════════════════════
   PIRÉ HELADERÍAS — helado-fallback.js
   VERSIÓN SVG de la escena, por si no hay WebGL
   o el usuario tiene prefers-reduced-motion.
   - Sin animaciones: el CSS apila el hero + los capítulos.
   - Con GSAP: muestra el helado completo y encadena el texto
     gigante y los capítulos de la historia con el scroll.
   ═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /**
   * Estado estático: helado completo, hero completo y capítulos visibles.
   * (El CSS ya apila todo en prefers-reduced-motion.)
   */
  function mostrarCompleto() {
    document.querySelectorAll(".escena .capa").forEach((el) => {
      el.style.visibility = "visible";
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    const fondo = document.querySelector(".fondo");
    if (fondo) fondo.style.backgroundColor = "#0B0B0B";

    // El texto gigante y el subtítulo se ven enteros, sin animación.
    document.querySelectorAll(".hero-linea .letra, .hero-sub, .hero-scroll")
      .forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });

    // Los capítulos quedan todos visibles.
    document.querySelectorAll(".capitulo").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  }

  function init() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Sin animaciones (o sin GSAP): estado estático.
    if (reduce || typeof gsap === "undefined") {
      mostrarCompleto();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // El helado SVG se muestra completo (no se "arma" por partes).
    gsap.set(".escena .capa", { autoAlpha: 1 });

    /* ── HERO: el texto gigante aparece y el helado se va por abajo ──
       Sin 3D no hay armado; el helado ya está entero, así que el
       recorrido sirve para revelar el texto. */
    const letras = gsap.utils.toArray(".hero-linea .letra");
    gsap.set(".hero-scroll", { opacity: 1 });

    const tlHero = gsap.timeline({
      defaults: { ease: "power2.out" },
      scrollTrigger: {
        trigger: "#escena",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
      },
    });

    // El texto ya se ve al cargar; con el scroll el helado baja y el
    // título vuelve a su brillo pleno.
    if (letras.length) {
      tlHero.to(letras, { opacity: 0.28, duration: 1.0 }, 0.2);
      tlHero.to(letras, { opacity: 1, duration: 1.0 }, 2.0);
    }
    tlHero.to(".helado-wrap", { y: "70vh", duration: 1.4, ease: "power2.in" }, 1.6);
    tlHero.to(".hero-scroll", { opacity: 0, duration: 0.4 }, 2.6);

    /* ── HISTORIA: capítulos encadenados ── */
    const caps = gsap.utils.toArray(".capitulo");
    if (caps.length) {
      gsap.set(caps, { opacity: 0 });
      gsap.set(caps[0], { opacity: 1 });

      const tlHist = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: "#historia",
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
        },
      });

      caps.forEach((cap, i) => {
        const contenido = cap.querySelectorAll(".cap-etiqueta, .cap-titulo, .cap-parrafo");
        const palabra = cap.querySelector(".cap-palabra");
        const bloque = 1;
        tlHist.fromTo([cap, ...contenido], { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.05 }, i * bloque);
        if (palabra) {
          tlHist.fromTo(palabra, { opacity: 0, xPercent: 12 },
            { opacity: 1, xPercent: 0, duration: 0.5 }, i * bloque);
        }
        if (i < caps.length - 1) {
          tlHist.to([cap, ...contenido], { opacity: 0, y: -30, duration: 0.45, ease: "power2.in" },
            i * bloque + 0.75);
          if (palabra) {
            tlHist.to(palabra, { opacity: 0, duration: 0.45, ease: "power2.in" }, i * bloque + 0.75);
          }
        }
      });
    }

    // Botón del cierre: fuera del foco mientras el helado tapa el texto.
    const btnPedir = document.querySelector(".btn-pedir");
    if (btnPedir) btnPedir.setAttribute("inert", "");
    ScrollTrigger.create({
      trigger: "#escena",
      start: "top top",
      end: "bottom bottom",
      onUpdate(self) {
        if (!btnPedir) return;
        if (self.progress > 0.9) btnPedir.removeAttribute("inert");
        else btnPedir.setAttribute("inert", "");
      },
    });
  }

  window.PireHeladoFallback = { init };
})();
