/**
 * Sabores oficiales de Piré Heladerías (lista de la web vieja).
 * Estructura:
 *   - Categorías con nombre; Frutales y Livianos tienen subgrupos
 *     ("De agua" / "De crema").
 *   - Cada gusto: { nombre, categoria, subgrupo? }
 *     `subgrupo` solo existe en frutales y livianos ("agua" | "crema").
 * Los colores por sabor ya no se usan (diseño de paneles rojos).
 */
window.SABORES_CATEGORIAS = [
  { id: "deliciosos", nombre: "Deliciosos" },
  { id: "tradicionales", nombre: "Tradicionales" },
  {
    id: "frutales",
    nombre: "Frutales",
    subgrupos: [
      { id: "agua", nombre: "De agua" },
      { id: "crema", nombre: "De crema" },
    ],
  },
  {
    id: "livianos",
    nombre: "Livianos (Light)",
    subgrupos: [
      { id: "agua", nombre: "De agua" },
      { id: "crema", nombre: "De crema" },
    ],
  },
  { id: "especiales", nombre: "Especiales" },
];

window.SABORES = [
  // ── Deliciosos ──
  { nombre: "Chocolate", categoria: "deliciosos" },
  { nombre: "Chocolate a la Turca", categoria: "deliciosos" },
  { nombre: "Chocolate Amargo", categoria: "deliciosos" },
  { nombre: "Chocolate Blanco", categoria: "deliciosos" },
  { nombre: "Chocolate con Almendras", categoria: "deliciosos" },
  { nombre: "Chocolate con Nueces", categoria: "deliciosos" },
  { nombre: "Chocolate con Uvas", categoria: "deliciosos" },
  { nombre: "Chocolate Piré", categoria: "deliciosos" },
  { nombre: "Chocolate Rocher", categoria: "deliciosos" },
  { nombre: "Chocolate Suizo", categoria: "deliciosos" },
  { nombre: "Mouse de Chocolate", categoria: "deliciosos" },
  { nombre: "Dulce de Leche", categoria: "deliciosos" },
  { nombre: "Dulce de Leche con Nueces", categoria: "deliciosos" },
  { nombre: "Dulce de Leche Granizado", categoria: "deliciosos" },
  { nombre: "Dulce de Leche Piré", categoria: "deliciosos" },

  // ── Tradicionales ──
  { nombre: "Almendrado", categoria: "tradicionales" },
  { nombre: "Chantilly", categoria: "tradicionales" },
  { nombre: "Cielito", categoria: "tradicionales" },
  { nombre: "Coco", categoria: "tradicionales" },
  { nombre: "Crema Flan", categoria: "tradicionales" },
  { nombre: "Crema Moka", categoria: "tradicionales" },
  { nombre: "Crema Rusa", categoria: "tradicionales" },
  { nombre: "Granizado", categoria: "tradicionales" },
  { nombre: "Kinotos al Whisky", categoria: "tradicionales" },
  { nombre: "Menta Granizada", categoria: "tradicionales" },
  { nombre: "Piña Colada", categoria: "tradicionales" },
  { nombre: "Pistacho", categoria: "tradicionales" },
  { nombre: "Sambayón", categoria: "tradicionales" },
  { nombre: "Sambayón con Almendras", categoria: "tradicionales" },
  { nombre: "Tramontana", categoria: "tradicionales" },
  { nombre: "Vainilla", categoria: "tradicionales" },
  { nombre: "Vainilla Granizada", categoria: "tradicionales" },

  // ── Frutales ──
  { nombre: "Ananá", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Caribe", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Durazno", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Frambuesa", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Frutilla", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Limón", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Mandarina", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Manzana", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Melón", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Naranja", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Pomelo", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Limón con cerezas", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Limón granizado", categoria: "frutales", subgrupo: "agua" },
  { nombre: "Banana", categoria: "frutales", subgrupo: "crema" },
  { nombre: "Bananita", categoria: "frutales", subgrupo: "crema" },
  { nombre: "Cereza", categoria: "frutales", subgrupo: "crema" },
  { nombre: "Frutilla", categoria: "frutales", subgrupo: "crema" },
  { nombre: "Frutilla Bariloche", categoria: "frutales", subgrupo: "crema" },
  { nombre: "Yogur de Maracuyá", categoria: "frutales", subgrupo: "crema" },

  // ── Livianos (Light) ──
  { nombre: "Ananá", categoria: "livianos", subgrupo: "agua" },
  { nombre: "Durazno", categoria: "livianos", subgrupo: "agua" },
  { nombre: "Limón", categoria: "livianos", subgrupo: "agua" },
  { nombre: "Chocolate", categoria: "livianos", subgrupo: "crema" },
  { nombre: "Dulce de Leche", categoria: "livianos", subgrupo: "crema" },
  { nombre: "Frutilla", categoria: "livianos", subgrupo: "crema" },
  { nombre: "Vainilla", categoria: "livianos", subgrupo: "crema" },

  // ── Especiales ──
  { nombre: "No me olvides", categoria: "especiales" },
  { nombre: "Banana Split", categoria: "especiales" },
  { nombre: "Chocotorta", categoria: "especiales" },
  { nombre: "Coco Quemado", categoria: "especiales" },
  { nombre: "Fiordibosco", categoria: "especiales" },
  { nombre: "Lemon Pie", categoria: "especiales" },
  { nombre: "Marroc", categoria: "especiales" },
  { nombre: "Tiramisú", categoria: "especiales" },
  { nombre: "Pico Dulce", categoria: "especiales" },
];
