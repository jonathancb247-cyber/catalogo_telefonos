const COLOR_CATALOG = {
  negro: {
    label: "Negro",
    aliases: ["negro", "black", "obsidiana", "obsidian", "grafito oscuro"],
    swatch: "#111111"
  },
  blanco: {
    label: "Blanco",
    aliases: ["blanco", "white", "porcelain", "cloudy white"],
    swatch: "#f5f5f5",
    border: true
  },
  gris: {
    label: "Gris",
    aliases: ["gris", "gray", "grey", "plata", "silver", "grafito"],
    swatch: "#9a9a9a"
  },
  azul: {
    label: "Azul",
    aliases: ["azul", "blue", "navy", "indigo", "indigo", "safiro"],
    swatch: "#3273dc"
  },
  verde: {
    label: "Verde",
    aliases: ["verde", "green", "mint", "menta", "olivo", "lima"],
    swatch: "#21b573"
  },
  rosa: {
    label: "Rosa",
    aliases: ["rosa", "pink", "rose"],
    swatch: "#e94f9b"
  },
  rojo: {
    label: "Rojo",
    aliases: ["rojo", "red", "product red"],
    swatch: "#d93025"
  },
  amarillo: {
    label: "Amarillo",
    aliases: ["amarillo", "yellow"],
    swatch: "#f5c518"
  },
  morado: {
    label: "Morado",
    aliases: ["morado", "violeta", "purple", "lavanda"],
    swatch: "#8c5bd6"
  },
  naranja: {
    label: "Naranja",
    aliases: ["naranja", "orange", "coral", "durazno"],
    swatch: "#f58220"
  },
  oro: {
    label: "Oro",
    aliases: ["oro", "gold", "dorado", "titanio desierto"],
    swatch: "#c8a96b"
  },
  natural: {
    label: "Titanio natural",
    aliases: ["natural", "titanio natural"],
    swatch: "#aaa79f"
  }
};

const COMMERCIAL_COLOR_LABELS = {
  "aura glow": "Aura Glow",
  "sorta sunny": "Sorta Sunny",
  "stormy black": "Stormy Black",
  "porcelain": "Porcelain",
  "obsidiana": "Obsidiana",
  "obsidian": "Obsidiana",
  "cloudy white": "Cloudy White"
};

const GENERIC_COLOR_LABELS = [
  "consulta colores disponibles",
  "consultar colores",
  "consulta color",
  "color por confirmar",
  "por definir",
  "varios colores",
  "colores disponibles",
  "consulta colores"
];

function normalizeColorName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericColorName(value = "") {
  const normalized = normalizeColorName(value);

  return GENERIC_COLOR_LABELS.some(
    label => normalized === label || normalized.includes(label)
  );
}

function getColorDefinition(value = "") {
  const normalized = normalizeColorName(value);

  if (!normalized || isGenericColorName(normalized)) {
    return null;
  }

  return Object.values(COLOR_CATALOG).find(definition =>
    definition.aliases.some(alias => {
      const normalizedAlias = normalizeColorName(alias);
      return normalized === normalizedAlias || normalized.includes(normalizedAlias);
    })
  ) || null;
}

function getColorLabel(value = "") {
  const normalized = normalizeColorName(value);

  if (!normalized || isGenericColorName(normalized)) {
    return "Consulta colores disponibles";
  }

  if (COMMERCIAL_COLOR_LABELS[normalized]) {
    return COMMERCIAL_COLOR_LABELS[normalized];
  }

  const definition = getColorDefinition(value);
  const exactCatalogMatch = definition?.aliases.some(
    alias => normalizeColorName(alias) === normalized
  );

  if (definition && exactCatalogMatch) {
    return definition.label;
  }

  return String(value).trim() || "Consulta colores disponibles";
}

function getColorSwatch(value = "") {
  return getColorDefinition(value)?.swatch || "";
}

if (typeof window !== "undefined") {
  window.COLOR_CATALOG = COLOR_CATALOG;
  window.normalizeColorName = normalizeColorName;
  window.getColorDefinition = getColorDefinition;
  window.getColorLabel = getColorLabel;
  window.getColorSwatch = getColorSwatch;
  window.isGenericColorName = isGenericColorName;
}

if (typeof module !== "undefined") {
  module.exports = {
    COLOR_CATALOG,
    normalizeColorName,
    getColorDefinition,
    getColorLabel,
    getColorSwatch,
    isGenericColorName
  };
}
