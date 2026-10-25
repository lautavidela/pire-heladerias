# Piré Heladerías — Estado del proyecto

## Visión
Scrollytelling de producto tipo MANA: el helado se **arma paso a paso con el scroll**.
Modelos **100% procedurales** en Three.js (sin GLB). Realismo de estudio.

## Stack
- HTML plano + CDN, **sin build**. Español rioplatense.
- GSAP 3.12.5 + ScrollTrigger + Lenis 1.1.13 (jsdelivr).
- Three.js `0.160.0` por importmap; `js/helado.js` (IIFE, `init()` async, `import()` dinámico).
- **Servidor local obligatorio** (HDR por fetch): `python -m http.server 8000` → http://localhost:8000

## Etapas
- **Etapa 1 — OK**: layout sin superposición (grid 45/55 desktop, 55dvh mobile), cono procedural
  waffle, luces de estudio, timeline de textos, reduced-motion estático.
- **Etapa 2 — OK**: 2 bochas procedurales (Perlin + textura por sabor) con caída/squash-and-stretch,
  cuarto de giro por bocha y encuadre de cámara con **área útil** que libra el header fijo.
- **Etapa 3 — OK**: salsa con goteos, granas (`InstancedMesh`), cereza; giro final del helado,
  rim light subida; SVG fallback a 2 bochas + toppings; limpieza de `.glb` y crédito Grab3D.

## Rediseño (ronda nueva)
- **R1 — Identidad visual (negro/blanco/rojo) — OK**: paleta `--rojo #E02130`, `--negro #131313`,
  `--negro-profundo #0B0B0B`, `--blanco`, `--gris #B0B0B0` (AA). Fuera todo el pastel (crema/rosa/
  celeste/fucsia/ddl). Tipografía **Montserrat** (400/600/800/900), títulos en mayúsculas (fuera
  Fredoka). Fondo oscuro con **grano** (gradientes CSS repetidos en `body::after`, capa fija
  z-index 1 — sin imágenes externas). Header negro translúcido con blur, logo blanco + puntito rojo,
  botones/acentos rojos. Iconos/emojis fuera de la UI y de `data/sabores.js`.
  - **Escena**: `.fondo` oscuro con resplandor radial rojo; en desktop el glow se alinea detrás del
    helado (columna derecha, `at 72.5%`), en mobile al centro. Colores de bochas/salsa SIN cambios.
  - **Luces**: subida la rim light fría + **segundo contraluz cálido** (`rim2`) para despegar la
    bocha de chocolate del fondo negro.
  - **Bug arreglado (preexistente)**: la bolita de progreso se anclaba al borde derecho en
    `onRefresh` aunque estuvieras arriba del todo; ahora respeta `progress`.
- **R2 — Sabores reales — OK**: `data/sabores.js` reescrito con la lista oficial (~90 gustos, 5
  categorías: Deliciosos, Tradicionales, Frutales, Livianos (Light), Especiales). Frutales y
  Livianos con subgrupos "De agua"/"De crema". `initSabores` renderiza **5 paneles rojos**
  (título blanco en mayúsculas + lista blanca); **grilla en desktop, acordeón en mobile** (sin
  botones de filtro, sin colores por sabor).
- **R3 — Hero a pantalla completa + historia propia — OK**: el helado pasó a ocupar **toda la
  pantalla** (estilo MANA) con capas: `.fondo` (oscuro + glow radial rojo al centro) →
  `.hero-texto` (título gigante `Heladería` blanco + `Piré` rojo, subtítulo y hint, **detrás**)
  → `.escena-visual` con canvas 3D `inset:0` `z-index:2` **encima** → header. Constantes
  `ALTURA_HERO_VH = 700` (desktop) / `ALTURA_HERO_VH_MOVIL = 600` y `ALTURA_HISTORIA_VH = 350`,
  aplicadas por JS a `#escena` y `#historia`. El título se ve **al cargar** (no hay hero en
  blanco): entra letra a letra una vez (animación, no scrub) y con el scroll **se atenúa a 0.28**
  mientras el helado se arma; al final (el helado baja y sale por abajo con giro) **vuelve a 1**.
  Nueva sección `#historia` pinned con 4 capítulos (Años 40, El reparto, 1986, Hoy), con
  **palabra gigante roja** (parallax, opacidad 0.85). Desktop: texto a la izquierda y palabra a
  la derecha; mobile: texto arriba y palabra anclada abajo (sin pisarse). Fallback SVG y
  reduced-motion actualizados (hero completo + capítulos apilados; `position: relative` para no
  quedar bajo `.fondo`).
  - **Un solo `ScrollTrigger` maestro** sobre `#historia` (`start: "top top"`, `end:
    "bottom bottom"`, `progress` 0..1); cada capítulo se enciende/apaga dentro de su tramo
    calculado por `progress` (entrada 26 %, sostén 48 %, salida 26 %). Antes cada capítulo
    creaba sus propios triggers con `+=N%`, que GSAP mide contra el **alto** de la sección
    (350vh) y no contra el **recorrido** real (alto − viewport = 250vh): los tramos se
    desfasaban y el último capítulo casi no entraba.
  - El grid desktop es `minmax(0, 1.05fr) minmax(0, 0.95fr)` y `.cap-palabra` va con
    `white-space: normal` + `overflow-wrap: anywhere` + `font-size: clamp(3.5rem, 8.5vw, 8.5rem)`;
    si la palabra fuerza su ancho, aplasta la columna del texto (era el bug del "reparto").
- **R4 — Animaciones inmersivas — OK**: `js/etapa4.js` (IIFE después de `main.js`), solo anima
  `transform`/`opacity`, sin librerías nuevas. Todo se apaga en reduced-motion y en mobile/touch.
  - **Separador marquee**: `.separador` rojo con texto gigante en mayúsculas. El contenido se arma
    **siempre** (JS); el loop horizontal y el **skew por velocidad** solo corren en desktop. Dos
    capas: `.marquee-fila` (recibe el skew con un `gsap.ticker` que interpola hacia 0 al frenar) y
    `.marquee-pista` (hace el loop `xPercent`). En mobile y reduced-motion queda **quieto**.
  - **Títulos por letra**: `.titulo-anim` se parte en `<span class="palabra">`/`.letra`
    (`aria-label` conserva el texto); entran con `opacity`/`yPercent`/`rotateX` y stagger.
  - **SABORES**: paneles entran con `translateZ(-220)` + `rotateX(26)`; en desktop, **tilt 3D con el
    mouse** (`quickTo` sobre `rotationX/Y`) con estado `.señalado`.
  - **TORTAS**: carrusel horizontal **pinned** (solo desktop). El alto de `#tortas` lo calcula el JS
    (`vh + recorrido`); un único ScrollTrigger mueve `#grilla-tortas` y **rota en Y cada tarjeta
    según su distancia al centro** (±24°, escala y `z`). En mobile queda **lista vertical**.
  - **POSTRES**: *stacking cards* sticky (solo desktop). El alto de `#postres` es
    `100 + (n-1)*60 vh`; **una sola timeline con `scrub`** (`start: "top top"`, `end:
    "bottom bottom"`) encadena los tramos: cada carta entra desde `y:130` con `opacity 0`
    hasta `y: -i*14` (paso 14px) y las anteriores se encogen 2 % cada una. Antes cada carta
    tenía su propio ScrollTrigger con `+=N%` relativo al **alto** de la sección, los tramos se
    solapaban y varias cartas quedaban en `opacity 0` con el mismo `top`.
  - **DESAYUNO**: parallax multicapa (`[data-capa]` 1/2/3) con distinto `y`/`rotateX`/`opacity`.
  - **CIFRAS**: contadores `[data-contar]` (con `data-prefijo`) que llegan a **60 / +30 / Años 40**;
    en reduced-motion muestran el valor final directo.
  - **DELIVERY**: botón gigante rojo `.btn-magnetico` **magnético** con el cursor (solo puntero fino)
    y **pulso** mientras `#estado-abierto` tenga `.abierto` (se sincroniza con `MutationObserver`).
    El pulso se mantiene como *estado* pero su animación se corta en reduced-motion. La fila
    `.acciones-delivery` es `align-items: center` (antes `stretch` estiraba el botón "Llamar" a
    137px) y el `.reveal` vive en **la fila**, no en cada botón: si está en el botón, queda en
    `opacity 0` cuando las secciones pinned cambian de alto.
  - **FOOTER**: logo `PIRÉ` gigante en rojo en su propia franja, recortado por el borde inferior
    (**sin superponerse** al texto del footer). `font-size: clamp(4.5rem, 22vw, 17rem)` +
    `margin-bottom: -0.08em`: recorte de ~21px (era `clamp(5rem, 30vw, 26rem)`, 416px, que no
    cabía y quedaba fuera del viewport).
  - **Acentos**: `.tarjeta` usa siempre `--rojo` (decisión de marca); `data/tortas.js` conserva el
    `color` por producto pero la UI ya no lo usa.
- **R5 — 2 bochas + hero corto + pedidos del cliente — OK**:
  - **Dos bochas** (antes 3): `crearBochas` arma solo chocolate + frutilla; salsa/granas/cereza se
    anclan a `bochas[bochas.length - 1]` (se adaptan solas). SVG fallback reubicado (salsa/granas/
    cereza bajaron ~87px: la bocha de arriba ahora está en `y=218`, no `131`); `bocha-3` eliminada;
    `aria-label` del SVG dice "dos bochas". `ALTURA_FINAL` 4.1 → **3.3** (encuadre acorde a la pila
    más baja).
  - **Hero más corto**: `ALTURA_HERO_VH` 700 → **420** (desktop) y `ALTURA_HERO_VH_MOVIL` 600 → **340**.
    Timeline re-temporizado y **`D` 17 → 11.6** (antes había ~6 unidades de cola muerta). Beats:
    cono 0–1.7, letras 1.8, bocha 1 a 2.8, bocha 2 a 4.9, salsa 7.0, granas 8.1, cereza 8.4,
    salida del helado 9.4, letras al 100 % a 10.0.
  - **Orden helado → texto**: las letras del título arrancan en `opacity 0` (`gsap.set`) y entran
    (`tl.to`, 1.8) **después** de que aparece el helado, no antes. Se atenúan a 0.22 durante el
    armado y vuelven a 1 al final.
  - **Sabores**: fuera los 5 paneles rojos gigantes → tarjetas oscuras con **cabecera roja** y
    listas en 2 columnas (desktop) / 1 (mobile); sin tilt en RM.
  - **Postres**: se abandonó el *stacking* (se solapaban) → **grilla limpia** 3 columnas (desktop) /
    1 (mobile) con entrada GSAP (`opacity`/`y`/`rotateX`, stagger).
  - **Cifras**: "Años 40" → **40** con `data-contar` y leyenda "años de elaboración artesanal".
  - **Footer**: eliminados los créditos (helado procedural + HDR) y el logo `PIRÉ` gigante.
  - **Mobile**: botón de WhatsApp más chico; sin overflow horizontal (390/390); `nPins=0`.
  - **Bug de sintaxis corregido**: el bloque de letras usaba `tl` **antes** de declararlo y el `if
    (heroTitulo)` quedaba sin cerrar; se movió la animación de letras después de crear el timeline.
- **R6 — Vida en mobile + desayuno en carrusel — OK**:
  - **Desayuno mobile → carrusel horizontal**: `.fotos-desayuno` pasa a `display: flex` +
    `overflow-x: auto` + `scroll-snap-type: x mandatory` (≤899px), con las fotos al **84 %** del ancho
    (`flex: 0 0 84%`, `scroll-snap-align: center`) y `gap 1.25rem`, así **se ve el borde de la
    siguiente** como *teaser* (antes: 3 fotos apiladas con solo 1rem, que se pisaban). El scroll es
    nativo (inercia táctil, `overscroll-behavior-x: contain`, scrollbar oculta). El breakpoint de la
    grilla de 3 columnas se movió de `min-width: 640px` a `min-width: 900px`.
  - **Marquee en mobile**: se quitó el bloque CSS que forzaba `transform: none` y el `esMovil()` del
    `return`; el **loop horizontal corre también en mobile** (más lento: `duration 26`). El *skew por
    velocidad* sigue **solo desktop** (`conSkew`), porque depende del gesto y en táctil se ve nervioso.
  - **Tortas mobile**: dejó de ser una lista muerta → entrada `opacity`/`y 40`/`scale 0.97` con
    stagger al scrollear (sin pin, para no romper el scroll táctil).
  - **Desayuno parallax**: queda **solo desktop**; en mobile las fotos entran con `opacity`/`y`
    (el parallax de scroll las pisaba dentro del carrusel).
  - **Postres mobile**: entrada más marcada (`y 55`, `rotateX -8`, `scale 0.96`, stagger 0.11).
  - **Títulos**: stagger por letra un poco mayor en mobile (0.035 vs 0.02).
  - **Limpieza**: `.gitignore` nuevo con `shots-*/` y `chrome-prof/` (las capturas de verificación
    nunca se versionan; se borran al cerrar cada ronda).

## Archivos clave
- `js/helado.js`: escena 3D completa. Constantes `ALTURA_HERO_VH=420`, `ALTURA_HERO_VH_MOVIL=340`,
  `ALTURA_HISTORIA_VH=350`, `ALTURA_FINAL=3.3`, `ANCHO_FINAL=1.75`, `MARGEN_ENCUADRE=1.06`, `D=11.6`,
  `R_BOCHA=0.6`, `TOPE_CONO=1.44`, `SABORES` (chocolate/frutilla), `FONDO` (colores oscuros por tramo).
  Funciones: `cargarEntorno`, `normalizarObjeto`, `crearCono`, `texturaBocha`, `crearBocha`,
  `crearBochas`, `crearSalsa`, `crearGranas`, `crearCereza`, `crearCamara`, `crearLuces`,
  `crearSombraContacto`, `construirTimeline`, `construirHistoria`, `encuadrar`, `arrancar/parar`,
  `dispose`.
- `index.html`: `#escena` con `.escena-texto` + `.escena-visual` + `.vineta`; 8 pasos;
  SVG fallback (**2 bochas** + toppings); anclas `#bienvenida`/`#historia`; favicon inline
  (rojo/blanco); Montserrat; `theme-color #131313`.
- `css/styles.css`: paleta de marca en `:root`; `#escena` alto `var(--escena-alto,420vh)`;
  grid; `.fondo` (degradados + glow rojo); `.grano` vía `body::after`; sabores (tarjetas oscuras +
  cabecera roja + `columns: 2`); postres (`.postres-stack` grilla 3 col).
- `data/sabores.js`: lista oficial; `SABORES_CATEGORIAS` con `subgrupos` opcional.
- `js/helado-fallback.js`: versión SVG (sin WebGL / reduced-motion).
- `js/main.js`: init general + Lenis + `window.PireHelado.init()`; `initSabores` (tarjetas/acordeón);
  `initTortas` (tarjetas de tortas/postres, acento siempre `var(--rojo)`).
- `js/etapa4.js`: animaciones de R4 (marquees, títulos por letra, sabores 3D, carrusel de tortas,
  entrada de postres, parallax de desayuno, contadores, botón magnético); se expone como
  `window.PireEtapa4`.
- `data/tortas.js`: tarjetas de tortas/postres/desayuno; conserva `color` por producto (no usado en UI).
- `.gitignore`: `shots-*/` y `chrome-prof/` (capturas de verificación; no se versionan).

## Toppings (Etapa 3)
- **Salsa**: casquete de esfera + 7 goteos (`LatheGeometry`). Cae desplegándose; goteos crecen escalonados.
- **Granas**: `InstancedMesh` de cilindros (150 desktop / 90 mobile), colores, fade-in.
- **Cereza**: bola roja (clearcoat) + cabito (`TubeGeometry`), cae con squash-and-stretch.
- Arrancan invisibles (`scale 0.001`) y se revelan en el timeline (beats 5-7).

## Verificación (CDP headless, Chrome)
- Desktop 1440×900: cobertura objeto **8.3 → 10.8 → 13.7 → 16.4 → 17.0 → 17.7 %**; 0 errores, 0 requests fallidos.
- Mobile 390×844: **4.9 → 10.8 %**; 0 errores; sin overflow horizontal.
- Reduced-motion: **8/8** pasos, **7/7** capas SVG; 0 errores.
- `node --check` OK en los 3 JS.
- **R1/R2 (nuevo)**: capturas por CDP remotas (`--remote-debugging-port`), scroll real; desktop
  1440×900 y mobile 390×844; **0 errores de consola**; sin overflow horizontal; grano presente
  (std ~3-5) tras mover la textura a `body::after` (el SVG con `feTurbulence` no pintaba en
  headless Chrome); glow rojo alineado al helado (centroide x≈0.72W).
- **R3/R4**: `node --check` OK en los 6 JS; **0 errores de consola y 0 requests fallidos** en un
  barrido completo (3000→22000). Desktop 1440×900: `scrollWidth == innerWidth` (1425), carrusel de
  tortas con la pista viajando 0 → −3498 y `rotateY` simétrico (±24°), postres apilándose, las 3
  capas de desayuno a distinto `top`, contadores en **60 / +30 / Años 40**, botón magnético con
  `x≈20`/`y≈11` y `pulso` activo, marquee con skew de −0.16° a −10.5° que vuelve a 0 al frenar y
  acento rojo presente en las tarjetas. Mobile 390×844: `scrollWidth == 390` (sin overflow),
  `nPins=0`, tortas en lista vertical, postres en flujo, marquee quieto, secciones sin alto forzado.
  Reduced-motion: `nPins=0`, marquee con contenido pero `transform: none`, títulos sin partir
  (texto normal), contadores en valor final, `.tortas-sticky`/`.postres-sticky`/`.panel-sabor` en
  `position: static`, botón sin transform ni animación de pulso; `docH` 22683 → 12169 (pins fuera).
- **Ronda de bugfixes desktop (historia / postres / delivery / footer) — OK**: `node --check` OK en
  los 6 JS; **0 errores de consola** (sólo los 4 logs informativos de la escena). Toda medición con
  `Network.setCacheDisabled(true)`, URL con `?t=<ts>` y espera ≥18 s (el HDR tarda ~10 s; con caché
  activa Chrome servía `helado.js` viejo y las mediciones mentían).
  - **Historia**: `#historia` mide 3150 (350vh) y el trigger maestro da `start 6300 → end 8550`
    (2250px = 250vh; antes medía **58px** por el `+=N%`). 0 triggers `capitulo` residuales. Los
    capítulos se encienden/apagan solos: y=6600 cap0 1.00; y=7000 cap1 0.94; y=7400 cap1 0.17;
    y=7800 cap2 1.00; y=8200 cap3 1.00. Grid desktop 627px/567px; texto 86→694, palabra 771→1338
    (sin solape; antes el texto quedaba en una franja de 66px).
  - **Postres**: `#postres` `start 15766 → end 18466` (400vh). Entrada progresiva: y=15700 carta 0;
    y=16200 c1; y=16800 c2; y=17400 c3; y=18000 c4; y=18400 las 6 a `op 1.00` apiladas con 14px de
    paso (tops 368→286) y `scale` 0.90→1.00.
  - **Delivery**: `.acciones-delivery` `align-items: center`; botón "Llamar" `op 1.00`, `h 68`
    (antes `op 0.00` y `h 137`).
  - **Footer**: al fondo absoluto (`scrollY 21247`) el footer va de 154→900 y el logo de 704→921
    (`logoH 218`, `font-size 272px`), con **recorte intencional de 21px** por debajo del borde.
  - Capturas: `shots-fix/` (desktop), `shots-mfix/` (mobile), `shots-rmfix/` (reduced-motion);
    0 errores en los 3 barridos. Mobile sigue sin overflow (`scrollWidth == 390`).
- **R5 (2 bochas + hero corto) — OK**: `node --check` OK en los 6 JS. Toda medición con
  `Network.setCacheDisabled(true)`, URL con `?t=<ts>` y espera ≥20 s.
  - Desktop 1440×900: `#escena` **3780px (4.20vh**, antes 6300/7vh); `bocha-2` presente, `bocha-3`
    **ausente**; `aria-label` del SVG "dos bochas"; `scrollWidth 1425 ≤ 1440`; **0 errores y 0
    requests fallidos** en barrido completo; `docH` 16307.
  - Orden helado → texto verificado por scroll: letra `opacity` 0 al inicio → **1.0 a frac 0.20**
    (ya apareció el helado) → 0.22 durante el armado → **1.0 al final**.
  - Silueta 3D (ocultando texto/header): se leen **dos domos** superpuestos + cono + cereza + salsa
    (antes eran tres). Centrada (centroide ≈ 0.5 del viewport).
  - Mobile 390×844: `#escena` 2870px (340vh), `scrollWidth 390 == innerWidth`, `nPins=0`, sabores en
    una columna sin overflow (348/348), postres grilla 1 col, tortas en lista vertical; **0 errores**.
  - Reduced-motion: `escena` 1216px, `nPins=0`, postres 6/6 visibles, `.tortas-sticky`/
    `.hero-texto` en `static`/`relative`, contadores en **60 / +30 / 40**; **0 errores**.
  - Cifras: tras scroll leen **60 | +30 | 40** con leyendas "gustos diferentes | años de historia |
    años de elaboración artesanal". Historia: 4 capítulos (`40s | Reparto | 1986 | Hoy`), grid
    636px/572px (sin aplastar el texto).
  - Capturas: `shots-2b/` (desktop + silueta 3D), `shots-2bm/` (mobile).
- **R6 (vida en mobile) — OK**: `node --check` OK en los JS. Mobile 390×844, CDP con caché
  deshabilitada y espera ≥20 s.
  - **Desayuno**: `display flex`, `overflow-x auto`, `scroll-snap-type x mandatory`, `gap 20px`,
    `flex-basis 84%`, contenedor `350px`, contenido `861px` (scrollable). Rectas de las fotos:
    `40/260 | 320/260 | 601/260` → la 2.ª **asoma ~30px** (efecto teaser). Aspect 4:3.
  - **Marquee**: el `transform` de la pista cambia entre frames (`-876` → `-930`) → **anima en
    mobile** (antes estaba forzado a `none`).
  - **Entradas**: tortas `0,0,…` → `1,1,…`; desayuno `0,0,0` → `1,1,1` tras scrollear; el marquee
    sigue animando después del scroll.
  - **Sin overflow**: `scrollWidth 390 == innerWidth` (392/392 en RM) en todo el barrido mobile;
    **0 errores y 0 requests fallidos** (`docH` 14149).
  - **Desktop 1440×900 intacto**: desayuno `grid` 3 col (345px c/u, gap 32px, `perspective 900px`),
    `foto0` con `matrix3d` (rotateX + `y`) → **parallax activo**; `.tortas-sticky` en `sticky`;
    marquee animando; `scrollWidth 1425 ≤ 1440`; **0 errores / 0 requests fallidos** (`docH` 16299).
  - **Reduced-motion**: desktop → `foto0 transform: none`, marquee quieto, `.tortas-sticky` static;
    mobile → desayuno `flex` con `scroll-snap: none`, fotos `opacity 1 / transform none`, tortas y
    postres visibles; **0 errores**.
  - Capturas: `shots-r6m/` (mobile).

## Créditos
- Único crédito externo: HDR *Studio Small 09* — Sergej Majboroda, Poly Haven (CC0).

## Pendientes / próximos pasos
- (ninguno bloqueante) Posible pulido: texturas de salsa más orgánicas, más variedad de toppings,
  revisar performance real en dispositivo; reemplazar los `.foto-placeholder` de desayuno y el
  `.mapa-placeholder` por imágenes/mapa reales.
