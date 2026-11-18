/* ═══════════════════════════════════════════════════════════
   PIRÉ HELADERÍAS — helado.js  (escena 3D con Three.js)
   Scrollytelling de producto: el helado se arma paso a paso,
   como un video controlado por el scroll (estilo MANA).

   Etapa 1: layout sin superposición + el cono (procedural)
   girando con el scroll, luces de estudio y timeline de textos.
   Etapa 2: 2 bochas procedurales (chocolate y frutilla) que caen
   con squash-and-stretch y giran un cuarto de vuelta por cada una.
   Etapa 3: salsa con goteos, granas (InstancedMesh) y cereza;
   giro final del helado, ajuste de rim light y optimización.

   Geometría 100% procedural (sin .glb): no hace falta ningún
   servidor para el archivo, pero igual conviene servirlo por
   http (por el importmap/CDN y para evitar bloqueos de file://).

   Iluminación: HDRI de estudio (PolyHaven, CC0) con fallback a
   RoomEnvironment.
   ═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Ajustes rápidos ───────────────────────────────────────── */

  // Alto del HERO (en vh): recorrido del armado del helado sobre el texto.
  // Más bajo = menos scroll. Ajustado para que termine antes.

  // Alto de la sección HISTORIA (en vh): los 4 capítulos pinned.

  // Alto/ancho del helado terminado (unidades de mundo) para encuadrar.
  // Se usa una caja fija para que la cámara NO salte al agregar bochas/toppings.
  // Ajustado a 2 bochas (antes 4.1 con 3 bochas).
  const ALTURA_FINAL = 3.3;
  const ANCHO_FINAL = 1.75;
  const MARGEN_ENCUADRE = 1.06;

  // Duración total del timeline (unidades; solo importan las proporciones).
  const D = 13.2;

  // Entorno HDR de estudio (CC0, PolyHaven). Si falla → RoomEnvironment.
  const HDR_URL =
    "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr";

  // Fondos por tramo (transiciones suaves a lo largo del recorrido).
  // Paleta oscura de marca: el resplandor radial rojo vive en el CSS de .fondo.
  const FONDO = {
    inicio: "#0B0B0B",
    producto: "#101012",
    bienvenida: "#131011",
    historia: "#0C0D11",
    cierre: "#120C0D",
  };

  // Bochas: una por sabor. `base` pinta el color; `acento`/`claro` manchan;
  // `detalle` agrega chips (chocolate), pintas (frutilla) o vetas (DDL).
  const SABORES = [
    { nombre: "chocolate", base: "#5A3B29", acento: "#3A2416", claro: "#7C5A43", detalle: "chips", rough: 0.5 },
    { nombre: "frutilla", base: "#F2A2B6", acento: "#D2587A", claro: "#FBE3EA", detalle: "pintas", rough: 0.38 },
    { nombre: "dulce de leche", base: "#C2844A", acento: "#8F5A28", claro: "#E0B486", detalle: "vetas", rough: 0.44 },
  ];

  // Radio de cada bocha y altura de la boca del cono (coincide con crearCono).
  const R_BOCHA = 0.6;
  const TOPE_CONO = 1.44;

  /* ── Estado de la escena ── */
  const escena = {};
  let rafId = null;
  let visible = false;

  /* ── Utilidades ── */
  const esMovil = () => window.matchMedia("(max-width: 768px)").matches;

  function webglDisponible() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
      return false;
    }
  }

  /* ───────────────────────────────────────────────────────────
     ENTORNO (HDR de estudio + fallback)
     ─────────────────────────────────────────────────────────── */
  async function cargarEntorno(THREE, renderer, pmrem, RGBELoader, RoomEnvironment) {
    try {
      const hdr = await new RGBELoader().loadAsync(HDR_URL);
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const env = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
      console.log("[Piré 3D] Entorno HDR cargado ✓ (" + HDR_URL.split("/").pop() + ")");
      return { env, real: true };
    } catch (err) {
      console.warn("[Piré 3D] HDR no disponible, usando RoomEnvironment.", err && err.message);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      return { env, real: false };
    }
  }

  /* ───────────────────────────────────────────────────────────
     INSPECTOR: resumen de un objeto/malla en consola
     (nodos, materiales, bounding box, eje "arriba")
     ─────────────────────────────────────────────────────────── */
  function resumenObjeto(THREE, root, etiqueta) {
    const caja = new THREE.Box3().setFromObject(root);
    const size = caja.getSize(new THREE.Vector3());
    const nodos = [];
    const materiales = new Set();
    let mallas = 0;
    let tris = 0;

    root.traverse((o) => {
      if (o.isMesh) {
        mallas++;
        const g = o.geometry;
        if (g && g.index && g.index.count) tris += g.index.count / 3;
        else if (g && g.attributes && g.attributes.position) tris += g.attributes.position.count / 3;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { if (m) materiales.add(m.type + (m.name ? " (" + m.name + ")" : "")); });
        nodos.push(o.name || "(mesh)");
      } else if (o.name) {
        nodos.push(o.name + " [group]");
      }
    });

    console.log("[Piré 3D] " + etiqueta + " — resumen:", {
      nodos,
      materiales: Array.from(materiales),
      mallas,
      triangulos: Math.round(tris),
      bboxMin: [+caja.min.x.toFixed(3), +caja.min.y.toFixed(3), +caja.min.z.toFixed(3)],
      bboxMax: [+caja.max.x.toFixed(3), +caja.max.y.toFixed(3), +caja.max.z.toFixed(3)],
      tamano: [+size.x.toFixed(3), +size.y.toFixed(3), +size.z.toFixed(3)],
      arriba: "eje Y (glTF / three.js)",
    });
  }

  /* Centra en X/Z y apoya la base en y=0 con Box3.
     Si se pasa `altura`, escala para alcanzarla (nada de números a ojo). */
  function normalizarObjeto(THREE, root, altura) {
    const caja0 = new THREE.Box3().setFromObject(root);
    const size0 = caja0.getSize(new THREE.Vector3());
    if (altura && size0.y > 0) {
      root.scale.multiplyScalar(altura / size0.y);
      root.updateMatrixWorld(true);
    }
    const caja = new THREE.Box3().setFromObject(root);
    const centro = caja.getCenter(new THREE.Vector3());
    root.position.x -= centro.x;
    root.position.z -= centro.z;
    root.position.y -= caja.min.y;
    root.updateMatrixWorld(true);
  }

  /* ───────────────────────────────────────────────────────────
     CONO PROCEDURAL (barquillo de waffle)
     ─────────────────────────────────────────────────────────── */
  function texturasCono(THREE) {
    const S = 512;
    const claro = "#C79253";
    const oscuro = "#916031";

    // Color (map)
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = S;
    const c = cnv.getContext("2d");
    c.fillStyle = claro;
    c.fillRect(0, 0, S, S);

    // Grano fino del barquillo
    for (let i = 0; i < 15000; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const v = Math.round(Math.random() * 40 - 20);
      c.fillStyle = v > 2 ? "#ffe2aa48" : "#3a1e0d4d";
      c.beginPath();
      c.ellipse(x, y, .55 + Math.random() * 2.25, .45 + Math.random() * 1.25, v, 0, Math.PI * 2);
      c.fill();
    }

    // Rombos del waffle (grilla diagonal)
    const pasoGrid = 64;
    const anchoLinea = 10;
    c.strokeStyle = oscuro;
    c.lineWidth = anchoLinea;
    c.beginPath();
    for (let i = -S; i < S * 2; i += pasoGrid) {
      c.moveTo(i, 0); c.lineTo(i + S, S);
      c.moveTo(i, 0); c.lineTo(i - S, S);
    }
    c.stroke();

    const map = new THREE.CanvasTexture(cnv);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 2);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;

    // Bump (mismo dibujo en gris: los surcos quedan hundidos)
    const cnvB = document.createElement("canvas");
    cnvB.width = cnvB.height = S;
    const cb = cnvB.getContext("2d");
    cb.fillStyle = "#ffffff";
    cb.fillRect(0, 0, S, S);
    cb.strokeStyle = "#4a4a4a";
    cb.lineWidth = anchoLinea;
    cb.beginPath();
    for (let i = -S; i < S * 2; i += pasoGrid) {
      cb.moveTo(i, 0); cb.lineTo(i + S, S);
      cb.moveTo(i, 0); cb.lineTo(i - S, S);
    }
    cb.stroke();

    for (let i = 0; i < 7500; i++) {
      cb.fillStyle = "#22222240";
      cb.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 1);
    }
    const bump = new THREE.CanvasTexture(cnvB);
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.copy(map.repeat);

    return { map, bump };
  }

  function crearCono(THREE) {
    const H = 1.35; // alto del cono
    const R = 0.62; // radio de la boca

    // Perfil (radio, alto): punta abajo → boca → reborde enrollado
    const pts = [];
    pts.push(new THREE.Vector2(0.0, 0.0));
    const segs = 26;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      pts.push(new THREE.Vector2(R * t, H * t));
    }
    pts.push(new THREE.Vector2(R * 1.03, H + 0.02));
    pts.push(new THREE.Vector2(R * 1.06, H + 0.06));
    pts.push(new THREE.Vector2(R * 1.0, H + 0.09));

    const geo = new THREE.LatheGeometry(pts, 96);
    geo.computeVertexNormals();

    const { map, bump } = texturasCono(THREE);

    const mat = new THREE.MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.026,
      roughness: 0.89,
      side: THREE.DoubleSide,
    });

    const malla = new THREE.Mesh(geo, mat);
    malla.name = "cono";
    malla.castShadow = true;
    malla.receiveShadow = true;

    const grupo = new THREE.Group();
    grupo.name = "cono-grupo";
    grupo.add(malla);
    return grupo;
  }

  /* ───────────────────────────────────────────────────────────
     BOCHAS PROCEDURALES (esferas "hechas a cucharón")
     ─────────────────────────────────────────────────────────── */

  // Textura de color según el sabor (map esférico).
  function texturaBocha(THREE, cfg) {
    const S = 512;
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = S;
    const c = cnv.getContext("2d");
    c.fillStyle = cfg.base;
    c.fillRect(0, 0, S, S);

    // Manchas suaves (mezcla de claro y acento)
    for (let i = 0; i < 240; i++) {
      const r = 20 + Math.random() * 62;
      const gx = Math.random() * S;
      const gy = Math.random() * S;
      const col = Math.random() < 0.5 ? cfg.claro : cfg.acento;
      const g = c.createRadialGradient(gx, gy, 0, gx, gy, r);
      g.addColorStop(0, col + "99");
      g.addColorStop(1, col + "00");
      c.fillStyle = g;
      c.beginPath();
      c.arc(gx, gy, r, 0, Math.PI * 2);
      c.fill();
    }

    // Detalles del sabor
    if (cfg.detalle === "chips") {
      for (let i = 0; i < 280; i++) {
        c.fillStyle = Math.random() < 0.5 ? "#2C1B10" : "#6B4A33";
        c.beginPath();
        c.arc(Math.random() * S, Math.random() * S, 1.5 + Math.random() * 3, 0, 6.3);
        c.fill();
      }
    } else if (cfg.detalle === "pintas") {
      for (let i = 0; i < 320; i++) {
        c.fillStyle = Math.random() < 0.5 ? cfg.acento : cfg.claro;
        c.beginPath();
        c.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 2.2, 0, 6.3);
        c.fill();
      }
    } else if (cfg.detalle === "vetas") {
      c.strokeStyle = "#8F5A28aa";
      for (let i = 0; i < 42; i++) {
        c.lineWidth = 3 + Math.random() * 9;
        let px = Math.random() * S;
        let py = Math.random() * S;
        c.beginPath();
        c.moveTo(px, py);
        for (let k = 0; k < 6; k++) {
          px += (Math.random() - 0.5) * 160;
          py += (Math.random() - 0.5) * 160;
          c.lineTo(px, py);
        }
        c.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  // Microrelieve de cristales y surcos de cuchara, continuo en la costura UV.
  function relieveBocha(THREE, perlin, semilla) {
    const lado = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = lado;
    const ctx = canvas.getContext("2d");
    const imagen = ctx.createImageData(lado, lado);
    for (let y = 0; y < lado; y++) {
      const polar = (y / (lado - 1)) * Math.PI;
      const radio = Math.sin(polar);
      const altura = Math.cos(polar);
      for (let x = 0; x < lado; x++) {
        const giro = (x / (lado - 1)) * Math.PI * 2;
        const u = radio * Math.cos(giro);
        const v = radio * Math.sin(giro);
        const surcos = perlin.noise(u * 13 + semilla, altura * 32, v * 13);
        const grano = perlin.noise(u * 51, altura * 51 + semilla, v * 51);
        const valor = 128 + surcos * 68 + grano * 46;
        const i = (y * lado + x) * 4;
        imagen.data[i] = imagen.data[i + 1] = imagen.data[i + 2] = valor;
        imagen.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imagen, 0, 0);
    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping;
    return textura;
  }

  // Una bocha: esfera deformada con Perlin + material tipo helado.
  function crearBocha(THREE, perlin, cfg, radio, semilla) {
    const seg = esMovil() ? 48 : 96;
    const geo = new THREE.SphereGeometry(radio, seg, Math.round(seg * 0.7));

    // Deformación (superficie irregular, "cucharón")
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    const s = semilla * 13.7;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = perlin.noise(v.x * 2.6 + s, v.y * 2.6 + s, v.z * 2.6 + s);
      const detalle = perlin.noise(v.x * 11 + s, v.y * 13, v.z * 11);
      const borde = Math.exp(-Math.pow((v.y / radio + 0.53) / 0.12, 2));
      const d = 1 + n * 0.105 + detalle * 0.037 + borde * (0.065 + detalle * 0.11);
      pos.setXYZ(i, v.x * d, v.y * d, v.z * d);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.scale(1, 0.93, 1); // apenas achatada (baked en la geometría)

    const mat = new THREE.MeshPhysicalMaterial({
      map: texturaBocha(THREE, cfg),
      bumpMap: relieveBocha(THREE, perlin, s),
      bumpScale: 0.037,
      roughness: cfg.rough + 0.12,
      metalness: 0.0,
      clearcoat: 0.12,
      clearcoatRoughness: 0.55,
      sheen: 0.28,
      sheenColor: 0xffffff,
      sheenRoughness: 0.85,
      envMapIntensity: 1.05,
    });

    const malla = new THREE.Mesh(geo, mat);
    malla.name = "bocha-" + cfg.nombre;
    malla.castShadow = true;
    malla.receiveShadow = true;
    return malla;
  }

  // Bochas, apiladas sobre la boca del cono. (Reducido a 2)
  function crearBochas(THREE, perlin) {
    const y1 = TOPE_CONO + R_BOCHA * 0.44;
    const y2 = y1 + R_BOCHA * 1.12;

    const disposicion = [
      { cfg: SABORES[0], y: y1, x: 0.0, z: 0.0 },
      { cfg: SABORES[1], y: y2, x: -0.06, z: 0.05 },
    ];

    return disposicion.map((d, i) => {
      const malla = crearBocha(THREE, perlin, d.cfg, R_BOCHA, i + 1);
      malla.position.set(d.x, d.y + 4.5, d.z);
      return { malla, cfg: d.cfg, yFinal: d.y, x: d.x, z: d.z };
    });
  }

  /* ───────────────────────────────────────────────────────────
     TOPPINGS: salsa con goteos, granas y cereza
     ─────────────────────────────────────────────────────────── */

  // Salsa de chocolate: casquete sobre la bocha de arriba + goteos.
  function crearSalsa(THREE, centro, radio) {
    const seg = esMovil() ? 40 : 80;
    const grupo = new THREE.Group();
    grupo.name = "salsa";

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x46270f,
      roughness: 0.26,
      metalness: 0.0,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
      sheen: 0.25,
      sheenColor: new THREE.Color(0x8a5a30),
    });

    // Casquete (cubre la parte de arriba de la bocha)
    const capGeo = new THREE.SphereGeometry(
      radio * 1.04, seg, Math.round(seg * 0.6), 0, Math.PI * 2, 0, 1.02
    );
    const vertices = capGeo.attributes.position;
    const punto = new THREE.Vector3();
    for (let i = 0; i < vertices.count; i++) {
      punto.fromBufferAttribute(vertices, i);
      const azimut = Math.atan2(punto.z, punto.x);
      const polar = Math.acos(THREE.MathUtils.clamp(punto.y / punto.length(), -1, 1));
      const ondulacion = Math.sin(azimut * 5) * 0.045 + Math.cos(azimut * 8) * 0.034;
      const angulo = polar + ondulacion * (polar / 1.02) ** 3;
      const r = punto.length();
      vertices.setXYZ(i, r * Math.sin(angulo) * Math.cos(azimut),
        r * Math.cos(angulo), r * Math.sin(angulo) * Math.sin(azimut));
    }
    capGeo.computeVertexNormals();
    const cap = new THREE.Mesh(capGeo, mat);
    cap.name = "salsa-cap";
    cap.castShadow = true;
    cap.receiveShadow = true;
    grupo.add(cap);

    // Goteos (perfil de gota: revolución alrededor del eje Y)
    const perfil = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.028, -0.012),
      new THREE.Vector2(0.05, -0.07),
      new THREE.Vector2(0.055, -0.15),
      new THREE.Vector2(0.04, -0.25),
      new THREE.Vector2(0.02, -0.33),
      new THREE.Vector2(0.0, -0.37),
    ];
    const geoGota = new THREE.LatheGeometry(perfil, esMovil() ? 12 : 20);

    const gotas = [];
    const n = 7;
    const rBorde = radio * Math.sin(1.02) * 0.96;
    const yBorde = radio * Math.cos(1.02);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const g = new THREE.Mesh(geoGota, mat);
      g.name = "goteo";
      g.position.set(Math.cos(a) * rBorde, yBorde, Math.sin(a) * rBorde);
      g.rotation.y = a;
      g.userData.esc = new THREE.Vector3(
        0.9 + Math.random() * 0.4,
        0.85 + Math.random() * 0.75,
        0.9 + Math.random() * 0.4
      );
      g.scale.copy(g.userData.esc);
      g.castShadow = true;
      grupo.add(g);
      gotas.push(g);
    }

    grupo.position.set(centro.x, centro.y, centro.z);
    return { grupo, cap, gotas };
  }

  // Granas: pequeños cilindros repartidos por la semiesfera superior (InstancedMesh).
  function crearGranas(THREE, centro, radio, cantidad) {
    const geo = new THREE.CylinderGeometry(0.011, 0.011, 0.048, 5);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.0, transparent: true, opacity: 0 });
    const malla = new THREE.InstancedMesh(geo, mat, cantidad);
    malla.name = "granas";

    const colores = [0xffffff, 0xf7a8c4, 0xf6d34a, 0x7ec8e3, 0x8bc34a, 0xe4572e];
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const eje = new THREE.Vector3();
    const tang = new THREE.Vector3();

    for (let i = 0; i < cantidad; i++) {
      const u = Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - u * 0.62); // 0..~55° desde el tope
      const r = radio * 1.04;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const z = r * Math.sin(phi) * Math.sin(theta);
      const y = r * Math.cos(phi);

      dummy.position.set(x, y, z);
      eje.set(x, y, z).normalize();
      tang.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).cross(eje);
      if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0);
      tang.normalize();
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tang);
      dummy.updateMatrix();
      malla.setMatrixAt(i, dummy.matrix);
      malla.setColorAt(i, color.setHex(colores[(Math.random() * colores.length) | 0]));
    }
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;

    malla.position.set(centro.x, centro.y, centro.z);
    return malla;
  }

  // Cereza: bola roja brillante + cabito curvo.
  function crearCereza(THREE, centro, yTope) {
    const grupo = new THREE.Group();
    grupo.name = "cereza";

    const radio = 0.16;
    const bola = new THREE.Mesh(
      new THREE.SphereGeometry(radio, esMovil() ? 24 : 40, esMovil() ? 18 : 30),
      new THREE.MeshPhysicalMaterial({
        color: 0xa2112c, roughness: 0.22, metalness: 0.0,
        clearcoat: 1.0, clearcoatRoughness: 0.1,
        sheen: 0.3, sheenColor: new THREE.Color(0xff8fa0),
      })
    );
    bola.name = "cereza-bola";
    bola.castShadow = true;
    bola.receiveShadow = true;
    grupo.add(bola);

    const eje = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, radio * 0.9, 0),
      new THREE.Vector3(0.02, radio * 0.9 + 0.2, 0.02),
      new THREE.Vector3(0.1, radio * 0.9 + 0.34, 0.04),
    ]);
    const cabito = new THREE.Mesh(
      new THREE.TubeGeometry(eje, 14, 0.013, 6, false),
      new THREE.MeshStandardMaterial({ color: 0x5c7a34, roughness: 0.6 })
    );
    cabito.name = "cereza-cabito";
    cabito.castShadow = true;
    grupo.add(cabito);

    grupo.userData.radio = radio;
    grupo.position.set(centro.x, yTope + radio, centro.z);
    return grupo;
  }

  /* ───────────────────────────────────────────────────────────
     CÁMARA
     ─────────────────────────────────────────────────────────── */
  function crearCamara(THREE, ancho, alto) {
    const fov = 32;
    return new THREE.PerspectiveCamera(fov, ancho / alto, 0.1, 100);
  }

  /* ───────────────────────────────────────────────────────────
     ILUMINACIÓN (key cálida + rim fría + hemisférica)
     ─────────────────────────────────────────────────────────── */
  function crearLuces(THREE, scene, radioSombra, conHdr) {
    // Key light cálida, con sombra suave
    const key = new THREE.DirectionalLight(0xfff2d9, conHdr ? 2.0 : 2.6);
    key.position.set(2.4, 5.2, 2.8);
    key.castShadow = !esMovil();
    const mapSize = esMovil() ? 1024 : 2048;
    key.shadow.mapSize.set(mapSize, mapSize);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 20;
    const e = radioSombra * 2.2;
    key.shadow.camera.left = -e;
    key.shadow.camera.right = e;
    key.shadow.camera.top = e;
    key.shadow.camera.bottom = -e;
    key.shadow.radius = 4;
    key.shadow.bias = -0.0006;
    scene.add(key);

    // Rim light fría desde atrás-izquierda: recorta la silueta
    // (importante contra el fondo oscuro: separa la bocha de chocolate).
    const rim = new THREE.DirectionalLight(0xbfe3ff, conHdr ? 1.7 : 2.1);
    rim.position.set(-2.8, 3.6, -4.6);
    scene.add(rim);

    // Segundo contraluz cálido desde atrás-derecha: completa el recorte
    // de la silueta sobre el fondo negro (sobre todo el chocolate).
    const rim2 = new THREE.DirectionalLight(0xffd9b8, conHdr ? 1.15 : 1.45);
    rim2.position.set(3.4, 4.4, -3.6);
    scene.add(rim2);

    // Relleno ambiental (más fuerte si no hay HDR real)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, conHdr ? 0.32 : 1.0));

    return { key, rim, rim2 };
  }

  /* ───────────────────────────────────────────────────────────
     SOMBRA DE CONTACTO (plano con degradado radial)
     ─────────────────────────────────────────────────────────── */
  function crearSombraContacto(THREE, radio) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    g.addColorStop(0, "rgba(60,40,25,0.5)");
    g.addColorStop(0.5, "rgba(60,40,25,0.22)");
    g.addColorStop(1, "rgba(60,40,25,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const geo = new THREE.PlaneGeometry(radio * 2.6, radio * 2.6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.002;
    mesh.renderOrder = -1;
    return mesh;
  }

  /* ───────────────────────────────────────────────────────────
     TIMELINE DEL HERO (recorrido continuo atado al scroll)
     Beat 0: cono entra desde abajo girando
     Beat 0.5: aparecen las letras "HELADERÍA PIRÉ" (después del helado)
     Beat 1: cae la bocha 1 (chocolate)
     Beat 2: cae la bocha 2 (frutilla)
     Beat 3: salsa + granas + cereza
     Beat 4: el helado BAJA y sale por abajo (giro final) → texto completo
     ═══════════════════════════════════════════════════════════════ */
  function construirTimeline(THREE, gsap, objetos) {
    const { grupoHelado, giro, cono, bochas, salsa, granas, cereza } = objetos;

    // Texto gigante: cada línea entra letra a letra (stagger).
    // El h1 se parte en <span class="letra"> preservando el texto para lectores.
    let letras = [];
    const heroTitulo = document.querySelector(".hero-titulo");
    if (heroTitulo) {
      const lineas = heroTitulo.querySelectorAll(".hero-linea");
      lineas.forEach((linea) => {
        const texto = linea.textContent;
        linea.setAttribute("aria-label", texto);
        linea.textContent = "";
        for (const ch of texto) {
          const s = document.createElement("span");
          s.className = "letra";
          s.setAttribute("aria-hidden", "true");
          s.textContent = ch === " " ? "\u00A0" : ch;
          linea.appendChild(s);
          letras.push(s);
        }
      });
    }

    // Latido del hint al cargar (se apaga cuando empieza el scroll).
    const hintLoop = gsap.to(".hero-scroll", {
      y: 8, duration: 1.4, yoyo: true, repeat: -1, ease: "sine.inOut",
    });
    ScrollTrigger.create({
      trigger: "#escena",
      start: "top top+=40",
      onEnter: () => hintLoop.pause(),
      onLeaveBack: () => hintLoop.play(),
    });

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      scrollTrigger: {
        trigger: "#escena",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
      },
    });

    const fondo = (color, t) => tl.to(".fondo", { backgroundColor: color, duration: 0.6 }, t);
    const dolly = (al, t, dur) => {
      if (escena.camOrbit) tl.to(escena.camOrbit, { zoom: al, duration: dur || 1, ease: "sine.inOut" }, t);
    };

    fondo(FONDO.inicio, 0);

    // Giro continuo del helado ligado al scroll (grupo exterior).
    tl.fromTo(grupoHelado.rotation, { y: 0 }, { y: -Math.PI * 2, duration: D - 3.6, ease: "none" }, 0);

    // Cuarto de giro por cada bocha que se apoya (grupo interior).
    let giroY = 0;
    const cuartoGiro = (t, dur) => {
      giroY += Math.PI / 2;
      tl.to(giro.rotation, { y: giroY, duration: dur || 0.9, ease: "power2.inOut" }, t);
    };
    const caerBocha = (b, t) => {
      if (!b) return;
      tl.to(b.malla.position, { y: b.yFinal, duration: 0.5, ease: "power2.in" }, t);
      tl.to(b.malla.scale, { x: 0.92, y: 1.14, z: 0.92, duration: 0.5, ease: "sine.in" }, t);
      tl.to(b.malla.scale, { x: 1.16, y: 0.78, z: 1.16, duration: 0.12, ease: "power2.out" }, t + 0.5);
      tl.to(b.malla.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: "elastic.out(1, 0.5)" }, t + 0.62);
    };
    const bocha = (i) => (bochas && bochas[i]) || null;

    // Órbita/zoom de cámara a lo largo del recorrido.
    if (escena.camOrbit) {
      tl.to(escena.camOrbit, { ang: escena.camOrbit.ang - 0.32, elev: escena.camOrbit.elev + 0.05, duration: D, ease: "none" }, 0);
    }

    // ── Beat 0: el cono entra desde abajo girando; "HELADERÍA" letra a letra ──
    if (cono) {
      const yCono = cono.position.y;
      tl.fromTo(cono.position, { y: yCono - 3.2 }, { y: yCono, duration: 1.7, ease: "power3.out" }, 0);
    }
    dolly(1.0, 0, 1.8);
    fondo(FONDO.producto, 2.0);

    // Mientras el helado se arma, el texto de fondo se atenúa un poco
    // (así el helado se lee mejor) y se vuelve a encender al final.
    if (letras.length) {
      tl.to(letras, { opacity: 0.22, duration: 0.8, ease: "power2.inOut" }, 3.6);
    }

    // ── Beat 1: cae la bocha 1 ──
    fondo(FONDO.bienvenida, 2.6);
    dolly(0.98, 2.5, 1.0);
    caerBocha(bocha(0), 2.8);
    cuartoGiro(3.7);

    // ── Beat 2: cae la bocha 2 ──
    fondo(FONDO.historia, 4.6);
    dolly(1.02, 4.6, 1.0);
    caerBocha(bocha(1), 4.9);
    cuartoGiro(5.8);

    // ── Beat 3: salsa + granas + cereza ──
    dolly(1.02, 6.8, 1.0);

    if (salsa) {
      const ySalsa = salsa.grupo.position.y;
      gsap.set(salsa.grupo.position, { y: ySalsa + 0.7 });
      gsap.set(salsa.grupo.scale, { x: 0.001, y: 0.001, z: 0.001 });
      salsa.gotas.forEach((g) => gsap.set(g.scale, { x: 0.001, y: 0.001, z: 0.001 }));
      tl.to(salsa.grupo.position, { y: ySalsa, duration: 0.9, ease: "power2.out" }, 7.0);
      tl.to(salsa.grupo.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: "power2.out" }, 7.0);
      salsa.gotas.forEach((g, i) => {
        const e = g.userData.esc;
        tl.to(g.scale, { x: e.x, y: e.y, z: e.z, duration: 0.6, ease: "power2.out" }, 7.7 + i * 0.06);
      });
    }

    if (granas) {
      gsap.set(granas.material, { opacity: 0 });
      tl.to(granas.material, { opacity: 1, duration: 0.7, ease: "sine.out" }, 8.1);
    }

    if (cereza) {
      const yCereza = cereza.position.y;
      gsap.set(cereza.position, { y: yCereza + 2.0 });
      gsap.set(cereza.scale, { x: 0.001, y: 0.001, z: 0.001 });
      tl.to(cereza.position, { y: yCereza, duration: 0.4, ease: "power2.in" }, 8.4);
      tl.to(cereza.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "sine.in" }, 8.4);
      tl.to(cereza.scale, { x: 1.12, y: 0.84, z: 1.12, duration: 0.1, ease: "power2.out" }, 8.8);
      tl.to(cereza.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: "elastic.out(1, 0.5)" }, 8.9);
    }

    // ── Beat 4: el helado BAJA y sale por abajo (giro final) ──
    // Acercamiento suave para ver las texturas con el helado completo.
    dolly(1.09, 9.15, 1.85);
    fondo(FONDO.cierre, 11.0);
    const yGrupo = grupoHelado.position.y;
    tl.to(grupoHelado.position, { y: yGrupo - 6.4, duration: 1.7, ease: "power2.in" }, 11.3);
    tl.to(grupoHelado.rotation, { y: -Math.PI * 3.2, duration: 1.9, ease: "power2.inOut" }, 11.3);
    if (letras.length) {
      tl.to(letras, { opacity: 1, duration: 0.8, ease: "power2.out" }, 12.0);
    }
    tl.to(".hero-scroll", { y: 0, duration: 0.4, ease: "power2.out" }, 12.2);
    tl.to(".hero-scroll", { opacity: 0, duration: 0.4 }, 12.7);

    // Botón del cierre (fuera del foco mientras el helado tapa el texto).
    const btnPedir = document.querySelector(".btn-pedir");
    if (btnPedir) btnPedir.setAttribute("inert", "");
    ScrollTrigger.create({
      trigger: "#escena",
      start: "top top",
      end: "bottom bottom",
      onUpdate(self) {
        if (!btnPedir) return;
        if (self.progress > 0.92) btnPedir.removeAttribute("inert");
        else btnPedir.setAttribute("inert", "");
      },
    });

    return tl;
  }

  /* ───────────────────────────────────────────────────────────
     TIMELINE DE LA HISTORIA (sección pinned propia)
     Cada capítulo vive en su propio tramo del scroll: entra, se
     sostiene y sale. Se usan dos ScrollTriggers por capítulo
     (entrada/salida) para que no se pisen entre sí.
     ─────────────────────────────────────────────────────────── */
  function construirHistoria(gsap) {
    const caps = gsap.utils.toArray(".capitulo");
    if (!caps.length) return null;

    const n = caps.length;

    // Contenido animable de cada capítulo (etiqueta + título + párrafo).
    const contenidos = caps.map((cap) =>
      cap.querySelectorAll(".cap-etiqueta, .cap-titulo, .cap-parrafo"));

    gsap.set(caps, { opacity: 0, y: 0 });
    gsap.set(contenidos, { opacity: 0, y: 30 });

    // UN solo ScrollTrigger sobre #historia, que es quien define el recorrido.
    // Antes cada capítulo creaba sus propios triggers con "+N%" relativo al
    // ALTO de la sección (350vh) en vez de al RECORRIDO real (alto - viewport),
    // así que los tramos se desfasaban y el último capítulo casi no entraba.
    // Ahora usamos el progreso del pin (0..1), que sí es exacto.
    const maestro = ScrollTrigger.create({
      trigger: "#historia",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate(self) {
        const p = self.progress;
        caps.forEach((cap, i) => {
          const palabra = cap.querySelector(".cap-palabra");
          const contenido = contenidos[i];
          const esUltimo = i === n - 1;

          // Tramo de cada capítulo dentro del recorrido total.
          const t0 = i / n;
          const entrada = (1 / n) * 0.26;
          const hold = (1 / n) * 0.48;
          const salida = (1 / n) * 0.26;

          // Progreso local del capítulo (0 = no entró, 1 = ya salió).
          const local = (p - t0) / salida;         // 0..1 a lo largo de la salida
          const localEntrada = (p - t0) / entrada; // 0..1 durante la entrada

          // Entrada
          if (p < t0) {
            gsap.set(cap, { opacity: 0, y: 30 });
            gsap.set(contenido, { opacity: 0, y: 30 });
            if (palabra) gsap.set(palabra, { opacity: 0, xPercent: 10 });
          } else if (p < t0 + entrada) {
            const e = gsap.utils.clamp(0, 1, localEntrada);
            gsap.set(cap, { opacity: e, y: 30 * (1 - e) });
            gsap.set(contenido, { opacity: e, y: 30 * (1 - e) });
            if (palabra) gsap.set(palabra, { opacity: 0.85 * e, xPercent: 10 * (1 - e) });
          } else if (!esUltimo && p >= t0 + entrada + hold) {
            // Salida
            const s = gsap.utils.clamp(0, 1, (p - (t0 + entrada + hold)) / salida);
            gsap.set(cap, { opacity: 1 - s, y: -30 * s });
            gsap.set(contenido, { opacity: 1 - s, y: -30 * s });
            if (palabra) gsap.set(palabra, { opacity: 0.85 * (1 - s), xPercent: 0 });
          } else {
            // Sostén: todo visible
            gsap.set(cap, { opacity: 1, y: 0 });
            gsap.set(contenido, { opacity: 1, y: 0 });
            if (palabra) gsap.set(palabra, { opacity: 0.85, xPercent: 0 });
          }
        });
      },
    });

    // Parallax propio de la palabra gigante (más lento que el texto).
    caps.forEach((cap) => {
      const palabra = cap.querySelector(".cap-palabra");
      if (!palabra) return;
      gsap.fromTo(palabra, { yPercent: 14 }, {
        yPercent: -14, ease: "none",
        scrollTrigger: { trigger: "#historia", start: "top top", end: "bottom bottom", scrub: true },
      });
    });

    return maestro;
  }

  /* ───────────────────────────────────────────────────────────
     CÁMARA (órbita + zoom desde escena.camOrbit)
     ─────────────────────────────────────────────────────────── */
  function aplicarCamara() {
    const cam = escena.camara;
    const centro = escena.centroOrbita;
    const o = escena.camOrbit;
    if (!cam || !centro || !o) return;

    const r = o.radio * o.zoom;
    const x = centro.x + r * Math.cos(o.elev) * Math.sin(o.ang);
    const y = centro.y + r * Math.sin(o.elev);
    const z = centro.z + r * Math.cos(o.elev) * Math.cos(o.ang);
    cam.position.set(x, y, z);
    cam.lookAt(centro);
  }

  /* ───────────────────────────────────────────────────────────
     INIT
     ─────────────────────────────────────────────────────────── */
  async function init() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Sin animaciones o sin WebGL -> fallback SVG
    if (reduce || !webglDisponible() || typeof gsap === "undefined") {
      if (window.PireHeladoFallback) window.PireHeladoFallback.init();
      return;
    }

    let THREE, RGBELoader, RoomEnvironment, ImprovedNoise;
    try {
      THREE = await import("three");
      ({ RGBELoader } = await import("three/addons/loaders/RGBELoader.js"));
      ({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js"));
      ({ ImprovedNoise } = await import("three/addons/math/ImprovedNoise.js"));
    } catch (err) {
      console.error("[Piré 3D] ✗ No se pudo cargar Three.js (¿importmap/CDN?)", err);
      if (window.PireHeladoFallback) window.PireHeladoFallback.init();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const section = document.getElementById("escena");
    const canvas = document.getElementById("helado-canvas");
    if (!section || !canvas) return;

    section.classList.add("modo-3d", "modo-cargando");

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: !esMovil(), powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, esMovil() ? 1.5 : 2));
    renderer.shadowMap.enabled = !esMovil(); // sin sombras pesadas en mobile
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    let w = canvas.clientWidth || window.innerWidth;
    let h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);

    /* ── Escena y entorno ── */
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const entorno = await cargarEntorno(THREE, renderer, pmrem, RGBELoader, RoomEnvironment);
    scene.environment = entorno.env;

    const camara = crearCamara(THREE, w, h);
    escena.renderer = renderer; escena.scene = scene; escena.camara = camara;

    function recalcSize() {
      const nw = canvas.clientWidth || window.innerWidth;
      const nh = canvas.clientHeight || window.innerHeight;
      if (nw === w && nh === h) return;
      w = nw; h = nh;
      camara.aspect = w / h;
      camara.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      encuadrar();
    }
    window.addEventListener("resize", recalcSize);

    /* ── Grupos: exterior (scroll) + interior (giro) ── */
    const grupoHelado = new THREE.Group();
    const giro = new THREE.Group();
    grupoHelado.add(giro);
    scene.add(grupoHelado);

    /* ── Cono procedural ── */
    const cono = crearCono(THREE);
    normalizarObjeto(THREE, cono); // centra X/Z y apoya la base en y=0
    resumenObjeto(THREE, cono, "Cono (procedural)");
    giro.add(cono);

    /* ── Bochas procedurales (caen y se apilan sobre el cono) ── */
    const perlin = new ImprovedNoise();
    const bochas = crearBochas(THREE, perlin);
    bochas.forEach((b) => giro.add(b.malla));
    if (bochas[0]) resumenObjeto(THREE, bochas[0].malla, "Bocha 1 (procedural)");

    /* ── Toppings: salsa, granas y cereza sobre la bocha de arriba ── */
    const b3 = bochas[bochas.length - 1];
    const centroTop = { x: b3 ? b3.x : 0, y: b3 ? b3.yFinal : 0, z: b3 ? b3.z : 0 };
    const yTope = centroTop.y + R_BOCHA * 0.93;
    const salsa = crearSalsa(THREE, centroTop, R_BOCHA);
    const granas = crearGranas(THREE, centroTop, R_BOCHA, esMovil() ? 90 : 150);
    const cereza = crearCereza(THREE, { x: centroTop.x, z: centroTop.z }, yTope);
    giro.add(salsa.grupo, granas, cereza);

    const radioSombra = ANCHO_FINAL * 0.5;
    crearLuces(THREE, scene, radioSombra, entorno.real);
    scene.add(crearSombraContacto(THREE, radioSombra));

    /* ── Encuadre de cámara (caja objetivo fija; no salta al crecer) ──
       Hero a pantalla completa: el helado se encuadra centrado dentro del
       área útil (deja libre el header fijo de arriba). No hay columna, así
       que el texto gigante queda detrás y el helado lo tapa solo al armarse. */
    function encuadrar() {
      const fovRad = (camara.fov * Math.PI) / 180;
      const tanH = Math.tan(fovRad / 2);
      const elHeader = document.querySelector(".header");
      const headerPx = elHeader ? elHeader.getBoundingClientRect().height : 0;
      const pad = 14;
      const util = Math.max(120, h - headerPx - pad * 2);

      const distAlto = (ALTURA_FINAL * h) / (2 * tanH * util);
      const distAncho = (ANCHO_FINAL * h) / (2 * tanH * w);
      const dist = Math.max(distAlto, distAncho) * MARGEN_ENCUADRE;

      // Corrimiento (mundo) para centrar el helado en el área útil.
      const mundoPorPx = (2 * dist * tanH) / h;
      const offsetCentro = headerPx / 2;

      if (!escena.camOrbit) {
        escena.camOrbit = { radio: dist, ang: 0.22, elev: 0.08, zoom: 1.18 };
      } else {
        escena.camOrbit.radio = dist;
      }
      escena.centroOrbita = new THREE.Vector3(
        0, ALTURA_FINAL * 0.5 + offsetCentro * mundoPorPx, 0
      );
      aplicarCamara();
    }
    encuadrar();

    /* ── Timelines: hero (armado) + historia (capítulos) ── */
    construirTimeline(THREE, gsap, { grupoHelado, giro, cono, bochas, salsa, granas, cereza });
    construirHistoria(gsap);

    /* ── Render loop con pausa por visibilidad ── */
    const clock = new THREE.Clock();
    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) arrancar(); else parar();
    }, { threshold: 0 });
    io.observe(section);

    function render() {
      rafId = requestAnimationFrame(render);
      const dt = Math.min(clock.getDelta(), 0.05);
      // Latido sutil: leve bamboleo vertical (siempre "vivo")
      giro.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.012;
      aplicarCamara();
      renderer.render(scene, camara);
    }
    function arrancar() { if (rafId == null) render(); }
    function parar() { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } }

    arrancar();

    /* ── Liberar recursos al salir ── */
    window.addEventListener("pagehide", () => dispose(THREE, scene, renderer, pmrem));

    section.classList.remove("modo-cargando");
    recalcSize();
    ScrollTrigger.refresh();

    console.log("[Piré 3D] Escena lista ✓ (Etapa 3: hero fullscreen + historia | móvil: " + esMovil() + ")");
  }

  function dispose(THREE, scene, renderer, pmrem) {
    scene.traverse((o) => {
      if (o.isMesh) {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
          m.dispose();
        });
        if (o.isInstancedMesh && o.dispose) o.dispose();
      }
    });
    if (pmrem) pmrem.dispose();
    renderer.dispose();
    console.log("[Piré 3D] Recursos liberados.");
  }

  window.PireHelado = {
    init,
    modelo: { crearCono, crearBocha, crearBochas, crearSalsa, crearGranas, crearCereza, normalizarObjeto, R_BOCHA, SABORES },
  };
})();
