const fs = require("fs");
const path = require("path");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const ROOT = __dirname;
const SOURCE_DIR = fs.existsSync(path.join(ROOT, "product"))
  ? "product"
  : path.join("assets", "products");
const OVERRIDES_FILE = path.join(ROOT, "catalog-overrides.json");
const OVERRIDE_FIELDS = [
  "model",
  "color",
  "category",
  "capacity"
];
const UNCERTAIN_COLOR_LABEL = "Consulta colores disponibles";

const sourcePath = path.join(ROOT, SOURCE_DIR);

const report = {
  totalProducts: 0,
  totalImages: 0,
  totalOverridesApplied: 0,
  overridesNotFound: [],
  overrideIdsModified: [],
  highConfidenceColors: 0,
  mediumConfidenceColors: 0,
  lowConfidenceColors: 0,
  colorsReplacedWithGenericLabel: 0,
  ignoredImages: [],
  ambiguousImages: [],
  productsWithoutNormalImage: [],
  possibleDuplicates: [],
  sprayImagesWithoutProduct: [],
  christmasImagesWithoutProduct: []
};

const imageStats = {
  normal: 0,
  spray: 0,
  christmas: 0,
  ignored: 0,
  ambiguous: 0
};

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayPath(filePath) {
  return path
    .relative(ROOT, filePath)
    .split(path.sep)
    .join("/");
}

function loadCatalogOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) {
    return {};
  }

  try {
    return JSON.parse(
      fs.readFileSync(OVERRIDES_FILE, "utf8")
    );
  } catch (error) {
    throw new Error(
      `No se pudo leer catalog-overrides.json: ${error.message}`
    );
  }
}

function applyCatalogOverrides(products) {
  const overrides = loadCatalogOverrides();
  const productById = new Map(
    products.map(product => [
      product.id,
      product
    ])
  );

  Object.entries(overrides).forEach(
    ([id, override]) => {
      const product = productById.get(id);

      if (!product) {
        report.overridesNotFound.push(id);
        console.warn(
          `Override ignorado: no existe producto con id "${id}".`
        );
        return;
      }

      if (
        !override ||
        typeof override !== "object" ||
        Array.isArray(override)
      ) {
        return;
      }

      let modified = false;

      OVERRIDE_FIELDS.forEach(
        field => {
          if (
            Object.prototype.hasOwnProperty.call(
              override,
              field
            )
          ) {
            product[field] =
              override[field];
            modified =
              true;
          }
        }
      );

      if (modified) {
        report.overrideIdsModified.push(id);
      }
    }
  );

  report.totalOverridesApplied =
    report.overrideIdsModified.length;
}

function cleanName(value) {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/^copia de\s+/i, "")
    .replace(/\s*\(\d+\)\s*$/g, "")
    .replace(/\bnavidad\b/gi, "")
    .replace(/\bgorrito\b/gi, "")
    .replace(/\bfondo blanco\b/gi, "")
    .replace(/\bmarketing\b/gi, "")
    .replace(/\bsolo con caja\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function getRouteParts(filePath) {
  return path
    .relative(sourcePath, filePath)
    .split(path.sep)
    .filter(Boolean);
}

function classifyImage(parts) {
  const normalizedParts = parts.map(normalizeText);

  if (normalizedParts.some(part => part.includes("gorrito"))) {
    return "christmas";
  }

  if (
    normalizedParts.some(
      part => /\b(sp|spr)ar?y\b/.test(part) || part.includes("spray")
    )
  ) {
    return "spray";
  }

  return "normal";
}

function shouldIgnore(filePath, parts) {
  const route = displayPath(filePath);
  const text = normalizeText(parts.join(" "));
  const filename = normalizeText(path.basename(filePath));

  const blocked = [
    "pano",
    "panos",
    "power band",
    "mica",
    "hidrogel",
    "macbook",
    "imac",
    "mac mini",
    "mini mac",
    "vision pro",
    "spen",
    "accesorio",
    "accesorios",
    "funda",
    "fundas",
    "cargador",
    "cargadores",
    "ensamble no mover",
    "cajas sueltas",
    "c original",
    "con tablet",
    "+ pencil",
    "+ mochila",
    "+ maletin",
    "+ magic keyboard"
  ];

  if (
    blocked.some(item => {
      if (
        item === "spen" &&
        (
          text.includes("motorola") ||
          text.includes("moto")
        )
      ) {
        return false;
      }

      return text.includes(item);
    })
  ) {
    return `Ignorada por regla: ${route}`;
  }

  if (filename.includes("airpods") || filename.includes("airpod")) {
    return `Ignorada por regla: ${route}`;
  }

  if (filename.startsWith("caja") || filename.includes(" cajas")) {
    return `Ignorada por regla: ${route}`;
  }

  if (filename.includes("whatsapp image")) {
    return `Imagen generica de WhatsApp: ${route}`;
  }

  return "";
}

const colorPatterns = [
  ["stormy black", "Stormy Black"],
  ["sorta sunny", "Sorta Sunny"],
  ["cloudy white", "Cloudy White"],
  ["aura glow", "Aura Glow"],
  ["rosa oro", "Rosa oro"],
  ["rose gold", "Rosa oro"],
  ["azul titanio", "Azul titanio"],
  ["titanio azul", "Titanio azul"],
  ["titanio natural", "Titanio natural"],
  ["natural titanium", "Titanio natural"],
  ["titanio negro", "Titanio negro"],
  ["black titanium", "Titanio negro"],
  ["titanio blanco", "Titanio blanco"],
  ["white titanium", "Titanio blanco"],
  ["titanio desierto", "Titanio del desierto"],
  ["desert titanium", "Titanio del desierto"],
  ["titanio violeta", "Titanio violeta"],
  ["titanio verde", "Titanio verde"],
  ["titanio naranja", "Titanio naranja"],
  ["titanio amarillo", "Titanio amarillo"],
  ["titanio gris", "Titanio gris"],
  ["negro plateado", "Negro / Plateado"],
  ["plata azul", "Plata / Azul"],
  ["azul dorado", "Azul / Dorado"],
  ["coral negro", "Coral / Negro"],
  ["porceleain", "Porcelain"],
  ["porcelain", "Porcelain"],
  ["obsidiana", "Obsidiana"],
  ["burgundy", "Burgundy"],
  ["midnight", "Medianoche"],
  ["medianoche", "Medianoche"],
  ["navy", "Navy"],
  ["indigo", "Indigo"],
  ["safiro", "Azul zafiro"],
  ["grafito", "Grafito"],
  ["graphite", "Grafito"],
  ["lavanda", "Lavanda"],
  ["violeta", "Violeta"],
  ["morado", "Morado"],
  ["lima", "Lima"],
  ["olivo", "Olivo"],
  ["menta", "Menta"],
  ["verde", "Verde"],
  ["green", "Verde"],
  ["rojo", "Rojo"],
  ["red", "Rojo"],
  ["amarillo", "Amarillo"],
  ["yellow", "Amarillo"],
  ["naranja", "Naranja"],
  ["orange", "Naranja"],
  ["rosa", "Rosa"],
  ["pink", "Rosa"],
  ["coral", "Coral"],
  ["azul", "Azul"],
  ["blue", "Azul"],
  ["negro", "Negro"],
  ["black", "Negro"],
  ["blanco", "Blanco"],
  ["blanc", "Blanco"],
  ["white", "Blanco"],
  ["plata", "Plata"],
  ["silver", "Plata"],
  ["dorado", "Dorado"],
  ["oro", "Oro"],
  ["gold", "Oro"],
  ["gris", "Gris"],
  ["gray", "Gris"],
  ["grey", "Gris"],
  ["crema", "Crema"],
  ["cream", "Crema"],
  ["beige", "Beige"],
  ["bronce", "Bronce"],
  ["bronze", "Bronce"],
  ["natural", "Natural"],
  ["desierto", "Desierto"],
  ["aluminio", "Aluminio"]
];

const brandColorPatterns = {
  Motorola: [
    ["azul oscuro", "Azul oscuro"],
    ["plateado torna", "Plateado tornasol"],
    ["magenta", "Magenta"],
    ["lila", "Lila"],
    ["durazno", "Durazno"]
  ],
  OnePlus: [
    ["esmeralda", "Esmeralda"]
  ]
};

function detectColorInfo(filePath, brand = "") {
  const filename = normalizeText(cleanName(path.basename(filePath)));
  const routeText = normalizeText(displayPath(filePath));
  const patterns = [
    ...(brandColorPatterns[brand] || []),
    ...colorPatterns
  ];

  for (const [pattern, color] of patterns) {
    const normalizedPattern = normalizeText(pattern);
    const regex = new RegExp(`(^|\\s)${escapeRegExp(normalizedPattern)}(\\s|$)`);

    if (regex.test(filename)) {
      return {
        color,
        confidence: "high"
      };
    }

    if (regex.test(routeText)) {
      return {
        color,
        confidence: "medium"
      };
    }
  }

  return {
    color: UNCERTAIN_COLOR_LABEL,
    confidence: "low"
  };
}

function detectColor(filePath, brand = "") {
  return detectColorInfo(filePath, brand).color;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeColorWords(value) {
  let result = normalizeText(value);

  for (const [pattern] of colorPatterns) {
    result = result.replace(
      new RegExp(`(^|\\s)${escapeRegExp(normalizeText(pattern))}(\\s|$)`, "g"),
      " "
    );
  }

  return result.replace(/\s+/g, " ").trim();
}

function titleWord(value) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function inferBrand(parts) {
  const text = normalizeText(parts.join(" "));

  if (text.includes("iphone") || text.includes("ipad") || text.includes("apple watch")) {
    return "Apple";
  }

  if (text.includes("samsung") || text.includes("galaxy") || /\bs\d{2}\b/.test(text) || /\ba\d{2}\b/.test(text)) {
    return "Samsung";
  }

  if (text.includes("google") || text.includes("pixel")) {
    return "Google";
  }

  if (text.includes("motorola") || /\bmoto\b/.test(text)) {
    return "Motorola";
  }

  if (text.includes("oneplus") || text.includes("one plus")) {
    return "OnePlus";
  }

  const first = normalizeText(parts[0] || "");

  if (first.includes("iphone")) {
    return "Apple";
  }

  if (first.includes("samsung")) {
    return "Samsung";
  }

  if (first.includes("google pixel")) {
    return "Google";
  }

  if (first.includes("motorola")) {
    return "Motorola";
  }

  if (first.includes("one plus") || first.includes("oneplus")) {
    return "OnePlus";
  }

  return "";
}

function inferModel(filePath, parts, brand) {
  const filename = removeColorWords(cleanName(path.basename(filePath)));
  const fullText = normalizeText([...parts.slice(0, -1), filename].join(" "));

  if (brand === "Apple") {
    return inferAppleModel(filename, fullText);
  }

  if (brand === "Samsung") {
    return inferSamsungModel(filename, fullText);
  }

  if (brand === "Google") {
    return inferGoogleModel(filename, fullText);
  }

  if (brand === "Motorola") {
    return inferMotorolaModel(filename, fullText);
  }

  if (brand === "OnePlus") {
    return inferOnePlusModel(filename, fullText);
  }

  return "";
}

function inferAppleModel(filename, fullText) {
  const text = normalizeText(filename);

  if (fullText.includes("apple watch ultra")) {
    const match = fullText.match(/\bultra\s*(\d+)?\b/);
    return match && match[1] ? `Apple Watch Ultra ${match[1]}` : "Apple Watch Ultra";
  }

  if (fullText.includes("apple watch")) {
    const series = fullText.match(/\b(?:serie|series|s)\s*(\d{1,2})\b/);
    const se = fullText.match(/\bse(?:\s*(2da|2|segunda))?\b/);

    if (series) {
      return `Apple Watch S${series[1]}`;
    }

    if (se) {
      return fullText.includes("2da") || fullText.includes("segunda")
        ? "Apple Watch SE 2da Gen"
        : "Apple Watch SE";
    }

    return "Apple Watch";
  }

  if (fullText.includes("ipad")) {
    const ipad = text.match(/\bipad\s*(pro|air|mini)?\s*(\d{1,2})?/);
    const suffix = [ipad?.[1] && titleWord(ipad[1]), ipad?.[2]].filter(Boolean).join(" ");
    return suffix ? `iPad ${suffix}` : "iPad";
  }

  const shared = text.match(/\biphone\s*(\d{1,2})\s*(?:_|\/|\s)?\s*\1\s*(mini|plus)\b/);
  if (shared) {
    return `iPhone ${shared[1]} / ${shared[1]} ${titleWord(shared[2])}`;
  }

  const proPm = text.match(/\biphone\s*(\d{1,2})\s*(pro\s*pm|propm|pm)\b/);
  if (proPm) {
    return `iPhone ${proPm[1]} Pro / Pro Max`;
  }

  const proMax = text.match(/\biphone\s*(\d{1,2})\s*pro\s*max\b/);
  if (proMax) {
    return `iPhone ${proMax[1]} Pro Max`;
  }

  const regular = text.match(/\biphone\s*(se\s*(?:2016|2020|2022)?|\d{1,2}e|\d{1,2}|x[rs]?s?\s*max|x[rs]?|air)\s*(pro|max|plus|mini)?\b/);
  if (regular) {
    let base = regular[1].replace(/\s+/g, " ").trim();
    let model = base.toLowerCase().startsWith("se")
      ? `SE ${base.replace(/^se\s*/i, "").trim()}`.trim()
      : base.toUpperCase() === "XS MAX"
        ? "XS Max"
        : base.toUpperCase();

    if (/^\d+e$/.test(base)) {
      model = `${base.slice(0, -1)}e`;
    } else if (/^\d+$/.test(base)) {
      model = base;
    }

    if (regular[2]) {
      model += ` ${titleWord(regular[2])}`;
    }

    return `iPhone ${model}`.replace(/\s+/g, " ").trim();
  }

  return "";
}

function inferSamsungModel(filename, fullText) {
  const text = normalizeText(filename);

  if (fullText.includes("galaxy watch") || fullText.includes("watch galaxy")) {
    const series = fullText.match(/\b(?:watch|serie|series|s)\s*(\d{1,2})\b/);
    if (fullText.includes("ultra")) {
      return series ? `Galaxy Watch Ultra ${series[1]}` : "Galaxy Watch Ultra";
    }
    if (fullText.includes("classic")) {
      return series ? `Galaxy Watch${series[1]} Classic` : "Galaxy Watch Classic";
    }
    if (fullText.includes("pro")) {
      return series ? `Galaxy Watch${series[1]} Pro` : "Galaxy Watch Pro";
    }
    return series ? `Galaxy Watch${series[1]}` : "Galaxy Watch";
  }

  if (fullText.includes("galaxy tab") || /\btab\s/.test(fullText)) {
    const tab = fullText.match(/\b(?:galaxy\s*)?tab\s*([as]\d{1,2}(?:\s*(?:plus|ultra|fe))?)?/);
    return tab?.[1] ? `Galaxy Tab ${formatSamsungSuffix(tab[1])}` : "Galaxy Tab";
  }

  const fold = fullText.match(/\bz\s*fold\s*(\d+)\b/);
  if (fold) {
    return `Galaxy Z Fold${fold[1]}`;
  }

  const flip = fullText.match(/\bz\s*flip\s*(\d+)\b/);
  if (flip) {
    return `Galaxy Z Flip${flip[1]}`;
  }

  const note = fullText.match(/\bnote\s*(\d{1,2})\s*(ultra|plus)?\b/);
  if (note) {
    return `Galaxy Note${note[1]}${note[2] ? ` ${titleWord(note[2])}` : ""}`;
  }

  const sSeries =
    text.match(/\b(?:galaxy\s*)?s\s*(\d{1,2})\s*(\+|ultra|plus|fe)?\b/) ||
    fullText.match(/\b(?:galaxy\s*)?s\s*(\d{1,2})\s*(\+|ultra|plus|fe)?\b/) ||
    text.match(/\bs(\d{1,2})(plus|ultra|fe)?/) ||
    fullText.match(/\bs(\d{1,2})(plus|ultra|fe)?/);
  if (sSeries) {
    const suffix =
      sSeries[2] === "+"
        ? "+"
        : sSeries[2]?.toUpperCase() === "FE"
          ? "FE"
          : sSeries[2]
            ? titleWord(sSeries[2])
            : "";

    if (suffix === "+") {
      return `Galaxy S${sSeries[1]}+`;
    }

    return `Galaxy S${sSeries[1]}${suffix ? ` ${suffix}` : ""}`;
  }

  const aSeries =
    text.match(/\b(?:galaxy\s*)?a\s*(\d{2})\b/) ||
    fullText.match(/\b(?:galaxy\s*)?a\s*(\d{2})\b/);
  if (aSeries) {
    return `Galaxy A${aSeries[1]}`;
  }

  return "";
}

function formatSamsungSuffix(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map(part => (/^[as]\d+/i.test(part) ? part.toUpperCase() : titleWord(part)))
    .join(" ");
}

function inferGoogleModel(filename, fullText) {
  const text = normalizeText(filename);

  if (fullText.includes("pixel watch")) {
    const watch = fullText.match(/\b(?:pw|pixel watch)\s*(\d+)?\b/);
    return watch?.[1] ? `Pixel Watch ${watch[1]}` : "Pixel Watch";
  }

  if (fullText.includes("pixel fold")) {
    return "Pixel Fold";
  }

  const pixel =
    text.match(/\bpixel\s*(\d+)\s*(a|pro\s*xl|pro|xl)?\b/) ||
    fullText.match(/\bpixel\s*(\d+)\s*(a|pro\s*xl|pro|xl)?\b/);

  if (pixel) {
    const suffix = pixel[2]
      ? pixel[2].replace(/\s+/g, " ").toLowerCase()
      : "";
    const formattedSuffix = suffix === "a"
      ? "a"
      : suffix
        .split(" ")
        .map(titleWord)
        .join(" ");

    return `Pixel ${pixel[1]}${formattedSuffix ? ` ${formattedSuffix}` : ""}`;
  }

  return "";
}

function inferMotorolaModel(filename, fullText) {
  const text = normalizeText(filename);

  if (
    fullText.includes("watch") ||
    fullText.includes("reloj")
  ) {
    const watch = fullText.match(/\b(?:moto|motorola)?\s*(?:watch|reloj)\s*(\d+)?\b/);
    return watch?.[1] ? `Motorola Watch ${watch[1]}` : "Motorola Watch";
  }

  if (fullText.includes("tablet") || /\btab\b/.test(fullText)) {
    const tablet = fullText.match(/\b(?:moto|motorola)?\s*(?:tab|tablet)\s*([a-z0-9]+)?\b/);
    return tablet?.[1] ? `Motorola Tablet ${tablet[1].toUpperCase()}` : "Motorola Tablet";
  }

  const razr =
    text.match(/\b(?:moto\s*)?razr\s*(\d{2})?\s*(ultra)?\b/) ||
    fullText.match(/\b(?:moto\s*)?razr\s*(\d{2})?\s*(ultra)?\b/);
  if (razr) {
    return [
      "Moto Razr",
      razr[1],
      razr[2] ? "Ultra" : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  const edge =
    text.match(/\b(?:motorola\s*)?edge\s*(\d{1,2})?\s*(pro|ultra|neo|fusion)?\b/) ||
    fullText.match(/\b(?:motorola\s*)?edge\s*(\d{1,2})?\s*(pro|ultra|neo|fusion)?\b/);
  if (edge) {
    return [
      "Motorola Edge",
      edge[1],
      edge[2] ? titleWord(edge[2]) : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  const stylus =
    text.match(/\bmoto\s*g\s*styl(?:us|os)\s*(5g)?\s*(\d{4})?\b/) ||
    fullText.match(/\bmoto\s*g\s*styl(?:us|os)\s*(5g)?\s*(\d{4})?\b/);
  if (stylus) {
    return [
      "Moto G Stylus",
      stylus[2],
      stylus[1]?.toUpperCase()
    ]
      .filter(Boolean)
      .join(" ");
  }

  const motoG =
    text.match(/\bmoto\s*g\s*([a-z]+|\d{1,3})?\s*(power|play|plus|pure|fast|stylus|5g)?\b/) ||
    fullText.match(/\bmoto\s*g\s*([a-z]+|\d{1,3})?\s*(power|play|plus|pure|fast|stylus|5g)?\b/);
  if (motoG) {
    return [
      "Moto G",
      motoG[1] ? formatModelToken(motoG[1]) : "",
      motoG[2] ? formatModelToken(motoG[2]) : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  const motoE =
    text.match(/\bmoto\s*e\s*(\d{1,2})?\b/) ||
    fullText.match(/\bmoto\s*e\s*(\d{1,2})?\b/);
  if (motoE) {
    return `Moto E${motoE[1] ? motoE[1] : ""}`;
  }

  const motoZ =
    text.match(/\bmoto\s*z\s*(\d{1,2})?\b/) ||
    fullText.match(/\bmoto\s*z\s*(\d{1,2})?\b/);
  if (motoZ) {
    return `Moto Z${motoZ[1] ? motoZ[1] : ""}`;
  }

  const motorolaOne =
    text.match(/\bmotorola\s*one\s*([a-z0-9]+)?\b/) ||
    fullText.match(/\bmotorola\s*one\s*([a-z0-9]+)?\b/);
  if (motorolaOne) {
    return [
      "Motorola One",
      motorolaOne[1] ? formatModelToken(motorolaOne[1]) : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function inferOnePlusModel(filename, fullText) {
  const text = normalizeText(filename);

  if (
    fullText.includes("watch") ||
    fullText.includes("reloj")
  ) {
    const watch = fullText.match(/\bone\s*plus\s*(?:watch|reloj)\s*(\d+)?\b/);
    return watch?.[1] ? `OnePlus Watch ${watch[1]}` : "OnePlus Watch";
  }

  if (fullText.includes("pad") || fullText.includes("tablet")) {
    const pad = fullText.match(/\bone\s*plus\s*(?:pad|tablet)\s*([a-z0-9]+)?\b/);
    return pad?.[1] ? `OnePlus Pad ${formatModelToken(pad[1])}` : "OnePlus Pad";
  }

  if (fullText.includes("open")) {
    return "OnePlus Open";
  }

  const nord =
    text.match(/\bone\s*plus\s*nord\s*([a-z0-9]+)?\s*(\d+)?\b/) ||
    fullText.match(/\bone\s*plus\s*nord\s*([a-z0-9]+)?\s*(\d+)?\b/);
  if (nord) {
    return [
      "OnePlus Nord",
      nord[1] ? formatModelToken(nord[1]) : "",
      nord[2]
    ]
      .filter(Boolean)
      .join(" ");
  }

  const ace =
    text.match(/\bone\s*plus\s*ace\s*(\d+)?\s*(pro|r|t)?\b/) ||
    fullText.match(/\bone\s*plus\s*ace\s*(\d+)?\s*(pro|r|t)?\b/);
  if (ace) {
    return [
      "OnePlus Ace",
      ace[1],
      ace[2] ? ace[2].toUpperCase() === "R" || ace[2].toUpperCase() === "T"
        ? ace[2].toUpperCase()
        : titleWord(ace[2])
        : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  const numbered =
    text.match(/\bone\s*plus\s*(\d{1,2})\s*(pro|r|t)?\b/) ||
    text.match(/\boneplus\s*(\d{1,2})\s*(pro|r|t)?\b/) ||
    fullText.match(/\bone\s*plus\s*(\d{1,2})\s*(pro|r|t)?\b/) ||
    fullText.match(/\boneplus\s*(\d{1,2})\s*(pro|r|t)?\b/);
  if (numbered) {
    return [
      "OnePlus",
      numbered[1],
      numbered[2] ? numbered[2].toUpperCase() === "R" || numbered[2].toUpperCase() === "T"
        ? numbered[2].toUpperCase()
        : titleWord(numbered[2])
        : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function formatModelToken(value) {
  if (!value) {
    return "";
  }

  if (/^\d+$/.test(value)) {
    return value;
  }

  if (value.toLowerCase() === "5g") {
    return "5G";
  }

  return titleWord(value);
}

function inferCategory(brand, model) {
  const text = normalizeText(model);

  if (brand === "Apple") {
    if (text.includes("ipad")) {
      return "iPad";
    }
    if (text.includes("watch")) {
      return "Apple Watch";
    }
    return "iPhone";
  }

  if (brand === "Samsung") {
    if (text.includes("tab")) {
      return "Samsung Tablets";
    }
    if (text.includes("watch")) {
      return "Samsung Watch";
    }
    if (text.includes("fold") || text.includes("flip")) {
      return "Samsung Plegables";
    }
    return "Samsung Smartphones";
  }

  if (brand === "Google") {
    if (text.includes("watch")) {
      return "Google Watch";
    }
    if (text.includes("fold")) {
      return "Google Plegables";
    }
    return "Google Smartphones";
  }

  if (brand === "Motorola") {
    if (text.includes("tablet")) {
      return "Tablets";
    }
    if (text.includes("watch")) {
      return "Wearables";
    }
    return "Motorola";
  }

  if (brand === "OnePlus") {
    if (text.includes("pad") || text.includes("tablet")) {
      return "Tablets";
    }
    if (text.includes("watch")) {
      return "Wearables";
    }
    return "OnePlus";
  }

  return "Otros";
}

function inferSegment(brand, model) {
  const text = normalizeText(`${brand} ${model}`);

  if (
    text.includes("galaxy z fold") ||
    text.includes("galaxy z flip") ||
    text.includes("pixel fold") ||
    text.includes("moto razr") ||
    text.includes("motorola razr") ||
    text.includes("oneplus open")
  ) {
    return "Plegables";
  }

  if (
    brand === "Apple" &&
    (
      text.includes("fold") ||
      text.includes("flip") ||
      text.includes("plegable")
    )
  ) {
    return "Plegables";
  }

  return "";
}

function productKey(brand, model, color) {
  return normalizeText(`${brand} ${model} ${color}`);
}

function idFromProduct(brand, model, color) {
  return normalizeText(`${brand}-${model}-${color}`)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pathScore(route) {
  const lower = normalizeText(route);
  let score = route.length;

  if (lower.includes("copia de")) score += 1000;
  if (/\(\d+\)/.test(route)) score += 500;
  if (lower.includes("sin llave")) score += 120;
  if (lower.includes("con llave")) score += 120;
  if (lower.includes("marketing")) score += 80;
  if (lower.includes("solo con caja")) score += 80;

  return score;
}

function chooseCleanerPath(current, candidate) {
  if (!current) {
    return candidate;
  }

  return pathScore(candidate) < pathScore(current) ? candidate : current;
}

function imageExists(route) {
  return fs.existsSync(path.join(ROOT, route.split("/").join(path.sep)));
}

function validateProducts(products) {
  const ids = new Set();
  const keys = new Set();

  for (const product of products) {
    if (ids.has(product.id)) {
      report.possibleDuplicates.push(`ID duplicado: ${product.id}`);
    }
    ids.add(product.id);

    const key = productKey(product.brand, product.model, product.color);
    if (keys.has(key)) {
      report.possibleDuplicates.push(`Producto duplicado: ${key}`);
    }
    keys.add(key);

    for (const field of ["image", "secondaryImage", "christmasImage"]) {
      if (product[field] && !imageExists(product[field])) {
        report.ambiguousImages.push(`Ruta inexistente en ${field}: ${product[field]}`);
      }
    }

    if (product.image && classifyImage(getRouteParts(path.join(ROOT, product.image))) !== "normal") {
      report.ambiguousImages.push(`Imagen principal no normal: ${product.image}`);
    }
  }
}

function buildCatalog() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`No existe la carpeta de productos: ${SOURCE_DIR}`);
  }

  const productsByKey = new Map();
  const pendingByType = {
    spray: [],
    christmas: []
  };

  const files = walk(sourcePath);
  report.totalImages = files.length;

  for (const filePath of files) {
    const parts = getRouteParts(filePath);
    const route = displayPath(filePath);
    const ignoredReason = shouldIgnore(filePath, parts);

    if (ignoredReason) {
      imageStats.ignored += 1;
      report.ignoredImages.push(ignoredReason);
      continue;
    }

    const type = classifyImage(parts);
    imageStats[type] += 1;

    const brand = inferBrand(parts);
    const model = inferModel(filePath, parts, brand);
    const colorInfo = detectColorInfo(filePath, brand);
    const color = colorInfo.color;

    if (!brand || !model) {
      imageStats.ambiguous += 1;
      report.ambiguousImages.push(route);
      continue;
    }

    const key = productKey(brand, model, color);

    if (!productsByKey.has(key)) {
      productsByKey.set(key, {
        id: idFromProduct(brand, model, color),
        brand,
        model,
        color,
        capacity: normalizeText(model).includes("watch")
          ? "Smartwatch"
          : "Pregunta por capacidad",
        category: inferCategory(brand, model),
        segment: inferSegment(brand, model),
        price: "Consultar",
        _colorConfidence: colorInfo.confidence,
        _normal: "",
        _spray: "",
        _christmas: ""
      });

      if (colorInfo.confidence === "high") {
        report.highConfidenceColors += 1;
      } else if (colorInfo.confidence === "medium") {
        report.mediumConfidenceColors += 1;
      } else {
        report.lowConfidenceColors += 1;
        report.colorsReplacedWithGenericLabel += 1;
      }
    }

    const product = productsByKey.get(key);

    if (type === "normal") {
      product._normal = chooseCleanerPath(product._normal, route);
    } else if (type === "spray") {
      product._spray = chooseCleanerPath(product._spray, route);
      pendingByType.spray.push(route);
    } else {
      product._christmas = chooseCleanerPath(product._christmas, route);
      pendingByType.christmas.push(route);
    }
  }

  const products = Array.from(productsByKey.values())
    .filter(product => {
      if (!product._normal) {
        report.productsWithoutNormalImage.push(
          `${product.brand} / ${product.model} / ${product.color}`
        );
      }

      return Boolean(product._normal);
    })
    .map(product => {
      const cleanProduct = {
        id: product.id,
        brand: product.brand,
        model: product.model,
        color: product.color,
        capacity: product.capacity,
        category: product.category,
        price: product.price,
        image: product._normal,
        _colorConfidence: product._colorConfidence
      };

      if (product.segment) {
        cleanProduct.segment = product.segment;
      }

      if (product._spray) {
        cleanProduct.secondaryImage = product._spray;
      }

      if (product._christmas) {
        cleanProduct.christmasImage = product._christmas;
      }

      return cleanProduct;
    });

  applyCatalogOverrides(products);

  report.highConfidenceColors = 0;
  report.mediumConfidenceColors = 0;
  report.lowConfidenceColors = 0;
  report.colorsReplacedWithGenericLabel = 0;

  products.forEach(product => {
    const confidence = product._colorConfidence || "high";

    if (confidence === "high") {
      report.highConfidenceColors += 1;
    } else if (confidence === "medium") {
      report.mediumConfidenceColors += 1;
    } else {
      report.lowConfidenceColors += 1;
    }

    if (product.color === UNCERTAIN_COLOR_LABEL) {
      report.colorsReplacedWithGenericLabel += 1;
    }

    delete product._colorConfidence;
  });

  products.sort((a, b) => {
    const brandCompare = a.brand.localeCompare(b.brand, "es");
    if (brandCompare) return brandCompare;

    const categoryCompare = a.category.localeCompare(b.category, "es");
    if (categoryCompare) return categoryCompare;

    const modelCompare = a.model.localeCompare(b.model, "es", { numeric: true });
    if (modelCompare) return modelCompare;

    return a.color.localeCompare(b.color, "es");
  });

  const productRoutes = new Set();
  for (const product of products) {
    if (product.secondaryImage) {
      productRoutes.add(product.secondaryImage);
    }
    if (product.christmasImage) {
      productRoutes.add(product.christmasImage);
    }
  }

  report.sprayImagesWithoutProduct = pendingByType.spray.filter(route => !productRoutes.has(route));
  report.christmasImagesWithoutProduct = pendingByType.christmas.filter(route => !productRoutes.has(route));

  report.totalProducts = products.length;
  validateProducts(products);

  return products;
}

function countBy(products, brand, categoryPredicate) {
  return products.filter(
    product => product.brand === brand && categoryPredicate(product.category)
  ).length;
}

function printSummary(products) {
  console.log("Catalogo generado correctamente.");
  console.log("");
  console.log("Productos:");
  console.log(`- Apple / iPhone: ${countBy(products, "Apple", category => category === "iPhone")}`);
  console.log(`- Apple / iPad: ${countBy(products, "Apple", category => category === "iPad")}`);
  console.log(`- Apple / Watch: ${countBy(products, "Apple", category => category === "Apple Watch")}`);
  console.log(`- Samsung / Smartphones: ${countBy(products, "Samsung", category => category === "Samsung Smartphones" || category === "Samsung Plegables")}`);
  console.log(`- Samsung / Tablets: ${countBy(products, "Samsung", category => category === "Samsung Tablets")}`);
  console.log(`- Samsung / Watch: ${countBy(products, "Samsung", category => category === "Samsung Watch")}`);
  console.log(`- Google / Smartphones: ${countBy(products, "Google", category => category === "Google Smartphones" || category === "Google Plegables")}`);
  console.log(`- Google / Watch: ${countBy(products, "Google", category => category === "Google Watch")}`);
  console.log(`- Motorola: ${countBy(products, "Motorola", category => category === "Motorola" || category === "Plegables" || category === "Tablets" || category === "Wearables")}`);
  console.log(`- OnePlus: ${countBy(products, "OnePlus", category => category === "OnePlus" || category === "Plegables" || category === "Tablets" || category === "Wearables")}`);
  console.log("");
  console.log("Imagenes asociadas:");
  console.log(`- Normales: ${imageStats.normal}`);
  console.log(`- Spray: ${imageStats.spray}`);
  console.log(`- Gorrito: ${imageStats.christmas}`);
  console.log("");
  console.log(`Ignoradas: ${imageStats.ignored}`);
  console.log(`Ambiguas: ${imageStats.ambiguous}`);
}

const products = buildCatalog();

fs.writeFileSync(
  path.join(ROOT, "products.json"),
  `${JSON.stringify(products, null, 2)}\n`,
  "utf8"
);

fs.writeFileSync(
  path.join(ROOT, "catalog-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

printSummary(products);
