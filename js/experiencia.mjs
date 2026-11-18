import * as THREE from "three";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import "./helado.js";

const portada = document.querySelector(".portada");
const cabina = portada.querySelector(".cabina");
const visor = portada.querySelector(".visor");
const canvas = document.getElementById("visor-helado");
const instrumentos = portada.querySelector(".instrumentos");
const etapa = document.getElementById("etapa-helado");
const tituloCapitulo = document.getElementById("titulo-capitulo");
const capitulos = new Map([
  ["Vista separada", "HELADO\nEN CAPAS."],
  ["El cucurucho de waffle", "EL\nCUCURUCHO."],
  ["Las bochas", "DOS\nBOCHAS."],
]);
const botones = [...portada.querySelectorAll("[data-sabor]")];
const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
const { crearCono, normalizarObjeto, R_BOCHA } = window.PireHelado.modelo;
const sabores = [
  { nombre: "frutilla", archivo: "frutilla", color: 0xcf8495 },
  { nombre: "dulce de leche", archivo: "dulce-de-leche", color: 0xad693a },
  { nombre: "pistacho", archivo: "pistacho", color: 0x9b9c56 },
];
const chocolate = { nombre: "chocolate", archivo: "chocolate", color: 0x633822 };
const lucesSabor = [0xffa1ac, 0xffbc89, 0xe0e9aa];

function esculpirBocha(punto, ruido, semilla) {
  const y = punto.y / R_BOCHA;
  const base = ruido.noise(punto.x * 3 + semilla, punto.y * 4, punto.z * 3);
  const detalle = ruido.noise(punto.x * 16, punto.y * 21 + semilla, punto.z * 16);
  const rugosidad = ruido.noise(punto.x * 38, punto.y * 41, punto.z * 38 + semilla);
  const pliegue = Math.exp(-((y + .5 + base * .37) ** 2) * 27);
  const estria = Math.sin(y * 32 + base * 7 + detalle * 1.5);
  const escala = 1 + base * .15 + detalle * .051 + rugosidad * .014 + pliegue * (.085 + estria * .029);
  punto.set(punto.x * escala, punto.y * escala * .89 + punto.x * .086, punto.z * escala);
}

function geometriaBocha(ruido, semilla) {
  const geometria = new THREE.SphereGeometry(R_BOCHA, 64, 42);
  const posiciones = geometria.attributes.position;
  const punto = new THREE.Vector3();
  for (let i = 0; i < posiciones.count; i++) {
    punto.fromBufferAttribute(posiciones, i);
    esculpirBocha(punto, ruido, semilla);
    posiciones.setXYZ(i, punto.x, punto.y, punto.z);
  }
  geometria.computeVertexNormals();
  return geometria;
}

async function iniciar() {
  const contexto = canvas.getContext("webgl2", { alpha: true, antialias: false, powerPreference: "high-performance" });
  if (!contexto) return;
  const renderer = new THREE.WebGLRenderer({ canvas, context: contexto, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.15));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(32, 1, .1, 80);
  const luzPrincipal = new THREE.DirectionalLight(0xffebd9, 2.35);
  luzPrincipal.position.set(-3, 5, 4);
  const contraluz = new THREE.DirectionalLight(0xffa1ac, 1.24);
  contraluz.position.set(2, 2, -4);
  const relleno = new THREE.DirectionalLight(0xe3c5b5, .77);
  relleno.position.set(2, -2, 3);
  escena.add(luzPrincipal, contraluz, relleno, new THREE.HemisphereLight(0xf5e4d6, 0x744a38, .68));

  const perlin = new ImprovedNoise();
  const modelo = new THREE.Group();
  const cono = crearCono(THREE);
  normalizarObjeto(THREE, cono);
  const cargador = new THREE.TextureLoader();
  const texturas = await Promise.all([chocolate, ...sabores].map(async (sabor) => {
    try {
      const textura = await cargador.loadAsync(new URL(`../assets/helado/${sabor.archivo}.webp`, import.meta.url).href);
      textura.colorSpace = THREE.SRGBColorSpace;
      textura.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      return textura;
    } catch {
      return null;
    }
  }));

  function materialBocha(sabor, textura) {
    return new THREE.MeshStandardMaterial({
      color: textura ? 0xffffff : sabor.color,
      map: textura,
      bumpMap: textura,
      bumpScale: .023,
      roughness: .89,
    });
  }

  const inferior = new THREE.Mesh(geometriaBocha(perlin, 2.3), materialBocha(chocolate, texturas[0]));
  const superior = new THREE.Mesh(geometriaBocha(perlin, 5.8), materialBocha(sabores[0], texturas[1]));
  const materiales = sabores.map((sabor, i) => i === 0 ? superior.material : materialBocha(sabor, texturas[i + 1]));
  const alturaInferior = 1.77;
  const posicion = new THREE.Vector3(-.09, 2.41, .045);
  const colorObjetivo = new THREE.Color(lucesSabor[0]);
  inferior.position.y = alturaInferior;
  superior.position.copy(posicion);
  modelo.add(cono, inferior, superior);
  escena.add(modelo);

  let giro = .32;
  let giroObjetivo = giro;
  let seleccionado = 0;
  let progreso = 0;
  let progresoObjetivo = 0;
  let inicioScroll = 0;
  let recorrido = 1;
  let tiempoAnterior = 0;
  let muestrasLentas = 0;
  let escala = renderer.getPixelRatio();
  let faseAnterior;
  let frame = 0;
  let visible = true;
  let operativo = true;
  let arrastre;
  const suavizar = (inicio, fin) => THREE.MathUtils.smoothstep(progreso, inicio, fin);

  function dimensionar() {
    const ancho = visor.clientWidth;
    const alto = visor.clientHeight;
    if (!ancho || !alto) return;
    renderer.setSize(ancho, alto, false);
    inicioScroll = portada.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(cabina).top) || 0);
    recorrido = Math.max(1, portada.offsetHeight - cabina.offsetHeight);
    actualizarProgreso();
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
  }

  function actualizarProgreso() {
    progresoObjetivo = reducir ? 0 : THREE.MathUtils.clamp((scrollY - inicioScroll) / recorrido, 0, 1);
  }

  function pintar(tiempo) {
    frame = 0;
    if (!visible || !operativo) return;
    const intervalo = tiempoAnterior ? tiempo - tiempoAnterior : 16.7;
    tiempoAnterior = tiempo;
    const peso = reducir ? 1 : 1 - Math.exp(-Math.min(intervalo, 65) / 75);
    progreso += (progresoObjetivo - progreso) * peso;
    giro += (giroObjetivo - giro) * peso;
    const moviendo = Math.abs(progresoObjetivo - progreso) > .0007 || Math.abs(giroObjetivo - giro) > .002;
    if (!moviendo) {
      progreso = progresoObjetivo;
      giro = giroObjetivo;
    }
    // Baja la resolución de respaldo si el dispositivo no sostiene el giro.
    muestrasLentas = moviendo && intervalo > 27 ? muestrasLentas + 1 : Math.max(0, muestrasLentas - 1);
    if (muestrasLentas >= 5 && escala > .56) {
      escala = Math.max(.55, escala * .8);
      renderer.setPixelRatio(escala);
      muestrasLentas = 0;
    }
    const desmontar = suavizar(.035, .26);
    const base = desmontar * (1 - suavizar(.34, .63));
    const bocha = desmontar * (1 - suavizar(.53, .88));
    const terminado = suavizar(.86, 1);

    cono.position.y = -.32 * base;
    inferior.position.set(-.13 * base, alturaInferior + .08 * base, 0);
    superior.position.set(posicion.x + .27 * bocha, posicion.y + .61 * bocha, posicion.z);
    modelo.rotation.set(.02 - .07 * bocha, giro + progreso * Math.PI * .73, -.10 + .15 * bocha);

    const distancia = Math.max(7, 5.7 / camara.aspect) + .85 * bocha - .25 * terminado;
    camara.position.set(.18, 1.65 + .21 * bocha, distancia);
    camara.lookAt(0, 1.50 + .19 * bocha, 0);
    contraluz.color.lerp(colorObjetivo, reducir ? 1 : .14);
    renderer.render(escena, camara);

    const fase = progreso < .035 ? "Cucurucho Piré"
      : progreso < .34 ? "Vista separada"
      : progreso < .58 ? "El cucurucho de waffle"
      : progreso < .89 ? "Las bochas" : "Cucurucho listo";
    if (fase !== faseAnterior) {
      etapa.textContent = fase;
      const titulo = capitulos.get(fase);
      if (titulo) {
        portada.dataset.capitulo = "";
        tituloCapitulo.textContent = titulo;
      } else {
        delete portada.dataset.capitulo;
      }
      faseAnterior = fase;
    }
    instrumentos.style.setProperty("--armado", progreso);
    if (moviendo) agendar();
    else tiempoAnterior = 0;
  }

  function agendar() {
    if (!frame && operativo && visible) frame = requestAnimationFrame(pintar);
  }

  botones.forEach((boton, indice) => {
    boton.addEventListener("click", () => {
      if (seleccionado === indice) return;
      seleccionado = indice;
      portada.dataset.sabor = indice;
      colorObjetivo.setHex(lucesSabor[indice]);
      superior.material = materiales[indice];
      botones.forEach((item) => item.setAttribute("aria-pressed", String(item === boton)));
      canvas.setAttribute("aria-label", `Modelo 3D de un cucurucho Piré con chocolate y ${sabores[indice].nombre}`);
      giroObjetivo += .42;
      agendar();
    });
  });
  document.getElementById("girar-helado").addEventListener("click", () => {
    giroObjetivo += Math.PI / 2;
    agendar();
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    arrastre = { id: event.pointerId, x: event.clientX };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (arrastre?.id !== event.pointerId) return;
    giroObjetivo += (event.clientX - arrastre.x) * .011;
    arrastre.x = event.clientX;
    agendar();
  });
  canvas.addEventListener("lostpointercapture", () => { arrastre = undefined; });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    operativo = false;
    portada.classList.remove("con-modelo");
    instrumentos.hidden = canvas.hidden = true;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    operativo = true;
    portada.classList.add("con-modelo");
    instrumentos.hidden = canvas.hidden = false;
    dimensionar();
    agendar();
  });
  window.addEventListener("scroll", () => {
    actualizarProgreso();
    agendar();
  }, { passive: true });
  new ResizeObserver(() => {
    dimensionar();
    agendar();
  }).observe(visor);
  new IntersectionObserver(([registro]) => {
    visible = registro.isIntersecting;
    agendar();
  }).observe(cabina);

  portada.classList.add("con-modelo");
  canvas.hidden = instrumentos.hidden = false;
  canvas.dataset.modelo = "webgl";
  dimensionar();
  agendar();
}

iniciar().catch((error) => {
  console.warn("No se pudo iniciar el visor de Piré.", error);
});
