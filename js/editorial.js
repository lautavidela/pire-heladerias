(() => {
  "use strict";

  const catalogo = document.getElementById("catalogo");
  const categorias = document.getElementById("categorias");
  const campo = document.getElementById("buscar");
  const lista = document.getElementById("resultados");
  const recuento = document.getElementById("recuento");
  const verMas = document.getElementById("ver-mas");
  const sabores = window.SABORES_CATEGORIAS;
  const normalizar = (texto) => texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const grupos = [{ id: "todos", nombre: "Todos" }, ...sabores, { id: "productos", nombre: "Tortas y postres" }];
  const nombres = new Map(sabores.map((grupo) => [grupo.id, grupo]));
  const carta = window.SABORES.map(({ nombre, categoria, subgrupo }) => {
    const grupo = nombres.get(categoria);
    const detalle = grupo.subgrupos?.find(({ id }) => id === subgrupo)?.nombre;
    return { nombre, categoria, detalle: [grupo.nombre, detalle].filter(Boolean).join(" · ") };
  });
  const productos = window.TORTAS.map(({ nombre, descripcion }) => ({
    nombre, categoria: "productos", detalle: descripcion,
  }));
  const botones = new Map();
  const pagina = 12;
  let categoria = "todos";
  let limite = pagina;

  function mostrar(ampliar = false) {
    const consulta = normalizar(campo.value.trim());
    const fuente = categoria === "productos" ? productos : carta;
    const resultados = fuente.filter((item) => (
      (categoria === "todos" || categoria === item.categoria) &&
      normalizar(item.nombre).includes(consulta)
    ));
    const cantidad = Math.min(limite, resultados.length);
    const visibles = resultados.slice(ampliar ? lista.children.length : 0, cantidad);
    if (!ampliar) lista.replaceChildren();
    const filas = visibles.map(({ nombre, detalle }) => {
      const fila = document.createElement("li");
      const titulo = document.createElement("strong");
      const tipo = document.createElement("span");
      titulo.textContent = nombre;
      tipo.textContent = detalle;
      fila.append(titulo, tipo);
      return fila;
    });
    lista.append(...filas);
    const sustantivo = categoria === "productos" ? "tortas y postres" : "sabores";
    recuento.textContent = resultados.length
      ? `${cantidad} de ${resultados.length} ${sustantivo}`
      : "No encontramos coincidencias. Probá con otro nombre.";
    verMas.hidden = cantidad === resultados.length;
    if (ampliar && filas.length) {
      filas[0].tabIndex = -1;
      filas[0].focus();
    }
  }

  function elegir(id) {
    categoria = id;
    limite = pagina;
    botones.forEach((boton, clave) => boton.setAttribute("aria-pressed", String(clave === id)));
    campo.placeholder = id === "productos" ? "Buscá una torta o un postre" : "Buscá un sabor";
    mostrar();
  }

  grupos.forEach(({ id, nombre }) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = nombre;
    boton.addEventListener("click", () => elegir(id));
    botones.set(id, boton);
    categorias.append(boton);
  });
  campo.addEventListener("input", () => {
    limite = pagina;
    mostrar();
  });
  verMas.addEventListener("click", () => {
    limite += pagina;
    mostrar(true);
  });
  document.querySelector("[data-productos]").addEventListener("click", () => {
    campo.value = "";
    elegir("productos");
  });
  catalogo.hidden = false;
  elegir("todos");

  const portada = document.querySelector(".portada");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let frame = 0;
    let inicio = portada.offsetTop;
    let alto = portada.offsetHeight;
    let x = 0;
    let y = 0;
    function pintar() {
      frame = 0;
      portada.style.setProperty("--x", `${x}px`);
      portada.style.setProperty("--y", `${y}px`);
      const progreso = Math.max(0, Math.min(1, (scrollY - inicio) / alto));
      portada.style.setProperty("--avance", `${progreso * 36}px`);
    }
    const agendar = () => { if (!frame) frame = requestAnimationFrame(pintar); };
    window.addEventListener("scroll", agendar, { passive: true });
    new ResizeObserver(() => {
      inicio = portada.offsetTop;
      alto = portada.offsetHeight;
      agendar();
    }).observe(portada);
    portada.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const rect = portada.getBoundingClientRect();
      x = ((event.clientX - rect.left) / rect.width - .5) * 24;
      y = ((event.clientY - rect.top) / rect.height - .5) * 18;
      agendar();
    }, { passive: true });
    portada.addEventListener("pointerleave", () => {
      x = 0;
      y = 0;
      agendar();
    });
  }
})();
