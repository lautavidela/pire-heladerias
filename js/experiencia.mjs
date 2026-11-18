import * as THREE from "three";
import { ImprovedNoise } from "three/addons/math/ImprovedNoise.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
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
  ["Salsa, granas y cereza", "EL TOQUE\nFINAL."],
]);
const botones = [...portada.querySelectorAll("[data-sabor]")];
const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
const { crearCono, crearBocha, crearBochas, crearSalsa, crearGranas, crearCereza, normalizarObjeto, R_BOCHA, SABORES } = window.PireHelado.modelo;
const sabores = [
  SABORES[1],
  SABORES[2],
  { nombre: "pistacho", base: "#9FAD68", acento: "#65703B", claro: "#D9DBA1", detalle: "pintas", rough: .55 },
];
const lucesSabor = [0xff637f, 0xffad71, 0xcee481];

function iniciar() {
  const contexto = canvas.getContext("webgl2", { alpha: true, antialias: true });
  if (!contexto) return;
  const renderer = new THREE.WebGLRenderer({ canvas, context: contexto, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .94;
  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const sala = new RoomEnvironment(renderer);
  const ambiente = pmrem.fromScene(sala, .025);
  escena.environment = ambiente.texture;
  sala.dispose();
  pmrem.dispose();

  const camara = new THREE.PerspectiveCamera(32, 1, .1, 80);
  const luzPrincipal = new THREE.DirectionalLight(0xffe7d1, 1.82);
  luzPrincipal.position.set(-3, 5, 4);
  const contraluz = new THREE.DirectionalLight(0xff597a, 2.8);
  contraluz.position.set(2, 2, -4);
  const relleno = new THREE.DirectionalLight(0xc2dcff, .38);
  relleno.position.set(2, -2, 3);
  escena.add(luzPrincipal, contraluz, relleno);

  const perlin = new ImprovedNoise();
  const modelo = new THREE.Group();
  const cono = crearCono(THREE);
  normalizarObjeto(THREE, cono);
  const [chocolate, frutilla] = crearBochas(THREE, perlin);
  const superiores = [frutilla.malla];
  const ajustarMaterial = (bocha) => {
    bocha.material.envMapIntensity = .52;
    bocha.material.clearcoat = .06;
  };
  ajustarMaterial(chocolate.malla);
  ajustarMaterial(frutilla.malla);
  const colorObjetivo = new THREE.Color(lucesSabor[0]);
  chocolate.malla.position.y = chocolate.yFinal;
  frutilla.malla.position.y = frutilla.yFinal;
  const posicion = frutilla.malla.position.clone();
  const cubierta = new THREE.Group();
  const salsa = crearSalsa(THREE, posicion, R_BOCHA);
  const granas = crearGranas(THREE, posicion, R_BOCHA, 58);
  granas.material.opacity = .85;
  const cereza = crearCereza(THREE, posicion, posicion.y + R_BOCHA * .93);
  cubierta.add(salsa.grupo, granas, cereza);
  modelo.add(cono, chocolate.malla, frutilla.malla, cubierta);
  escena.add(modelo);

  // Los cristales también son geometría 3D y orbitan por detrás y delante.
  const cristales = new THREE.Group();
  const cristalGeo = new THREE.OctahedronGeometry(1);
  const cristalMat = new THREE.MeshPhysicalMaterial({
    color: 0xff9fb6, roughness: .24, metalness: .36, clearcoat: .8,
    transparent: true, opacity: .72,
  });
  for (let i = 0; i < 34; i++) {
    const cristal = new THREE.Mesh(cristalGeo, cristalMat);
    const angulo = i * 2.39996;
    const radio = 1.1 + (i % 7) * .105;
    cristal.position.set(Math.cos(angulo) * radio, .25 + (i % 16) * .215, Math.sin(angulo) * radio);
    cristal.rotation.set(angulo, i, -angulo);
    const dimension = .016 + (i % 8) * .005;
    cristal.scale.set(dimension, dimension * (1 + i % 3), dimension);
    cristales.add(cristal);
  }
  escena.add(cristales);

  let actual = superiores[0];
  let giro = .32;
  let giroObjetivo = giro;
  let seleccionado = 0;
  let progreso = 0;
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
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
  }

  function pintar() {
    frame = 0;
    if (!visible || !operativo) return;
    const rect = portada.getBoundingClientRect();
    const recorrido = Math.max(1, rect.height - cabina.offsetHeight);
    const desplazamiento = cabina.getBoundingClientRect().top - rect.top;
    progreso = reducir ? 0 : THREE.MathUtils.clamp(desplazamiento / recorrido, 0, 1);
    const desmontar = suavizar(.025, .22);
    const base = desmontar * (1 - suavizar(.30, .50));
    const bocha = desmontar * (1 - suavizar(.48, .72));
    const terminacion = desmontar * (1 - suavizar(.67, .88));

    cono.position.y = -.31 * base;
    chocolate.malla.position.y = chocolate.yFinal - .17 * base;
    actual.position.set(posicion.x + .32 * bocha, posicion.y + .44 * bocha, posicion.z);
    cubierta.position.set(-.27 * terminacion, .94 * terminacion, -.14 * terminacion);
    giro += (giroObjetivo - giro) * (reducir ? 1 : .16);
    modelo.rotation.set(.02 - .09 * bocha, giro + progreso * Math.PI * 1.25, -.10 + .19 * bocha);
    cristales.rotation.y = -.25 - progreso * 2.5 + giro * .22;

    const distancia = Math.max(7.5, 5.9 / camara.aspect) + 1.5 * terminacion;
    camara.position.set(.18, 1.82 + .24 * terminacion, distancia);
    camara.lookAt(0, 1.72 + .22 * terminacion, 0);
    contraluz.color.lerp(colorObjetivo, reducir ? 1 : .14);
    renderer.render(escena, camara);

    const fase = progreso < .035 ? "Cucurucho Piré"
      : progreso < .31 ? "Vista separada"
      : progreso < .49 ? "El cucurucho de waffle"
      : progreso < .72 ? "Las bochas"
      : progreso < .89 ? "Salsa, granas y cereza" : "Cucurucho listo";
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
    if (Math.abs(giroObjetivo - giro) > .002) agendar();
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
      modelo.remove(actual);
      if (!superiores[indice]) {
        superiores[indice] = crearBocha(THREE, perlin, sabores[indice], R_BOCHA, 2);
        ajustarMaterial(superiores[indice]);
      }
      actual = superiores[indice];
      modelo.add(actual);
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
  window.addEventListener("scroll", agendar, { passive: true });
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

try {
  iniciar();
} catch (error) {
  console.warn("No se pudo iniciar el visor de Piré.", error);
}
