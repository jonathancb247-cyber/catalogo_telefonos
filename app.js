const CONFIG = {

  storeName: "PhoneDepot",

  supabaseFunctionUrl:
    "https://rhcilyuwsljhayygartt.supabase.co/functions/v1/asignar-vendedor",

  supabasePublishableKey:
    "sb_publishable_NkU48ucQy6-Z05YJSsaduQ_WdUzygWp",

  /*
   * REEMPLAZAR con el enlace real de Google Maps
   * de la sucursal PhoneDepot.
   */
  googleMapsUrl:
    "https://www.google.com/maps/search/?api=1&query=PhoneDepot+Aguascalientes"

};


// ============================================
// ESTADO
// ============================================

let products = [];

let productVariants = [];

let activeCategory = "Todos";

let dialogProductId = null;

let preloadedSeller = null;

let sellerPreloadPromise = null;

const BRAND_LOGOS = {
  Apple: "assets/branding/brands/apple.svg",
  Samsung: "assets/branding/brands/samsung.svg",
  Google: "assets/branding/brands/google.svg",
  Motorola: "assets/branding/brands/motorola.svg",
  OnePlus: "assets/branding/brands/oneplus.svg"
};

const DEV_FORCE_CHRISTMAS_GALLERY =
  false;

const brandCategories = [
  {
    name: "Todos"
  },
  {
    name: "Plegables",
    logo: "▯"
  },
  {
    name: "Apple"
  },
  {
    name: "Samsung"
  },
  {
    name: "Google"
  },
  {
    name: "Motorola"
  },
  {
    name: "OnePlus"
  }
];


// ============================================
// ELEMENTOS DOM
// ============================================

const grid =
  document.querySelector("#productGrid");

const searchInput =
  document.querySelector("#searchInput");

const categoryFilters =
  document.querySelector("#categoryFilters");

const brandScrollLeft =
  document.querySelector(".brand-scroll-left");

const brandScrollRight =
  document.querySelector(".brand-scroll-right");

const resultCount =
  document.querySelector("#resultCount");

const emptyState =
  document.querySelector("#emptyState");

const dialog =
  document.querySelector("#productDialog");

const dialogWhatsapp =
  document.querySelector("#dialogWhatsapp");

const dialogImage =
  document.querySelector("#dialogImage");

const dialogThumbnails =
  document.querySelector("#dialogThumbnails");

const dialogGoogleMaps =
  document.querySelector("#dialogGoogleMaps");


// ============================================
// IMAGENES DE PRODUCTO
// ============================================

function isChristmasSeason(date = new Date()) {

  if (DEV_FORCE_CHRISTMAS_GALLERY) {

    return true;

  }

  const month =
    date.getMonth();

  const day =
    date.getDate();


  return (
    month === 11 ||
    (
      month === 0 &&
      day <= 6
    )
  );

}


function encodeImagePath(imagePath) {

  return imagePath
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/");

}


function getProductGallery(product) {

  const gallery = [];


  if (
    isChristmasSeason() &&
    product.christmasImage
  ) {

    gallery.push(product.christmasImage);

  }


  if (product.image) {

    gallery.push(product.image);

  }


  if (product.secondaryImage) {

    gallery.push(product.secondaryImage);

  }


  return [
    ...new Set(gallery)
  ];

}

function normalizeImageBaseName(imagePath = "") {
  return imagePath
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^copia de\s+/i, "")
    .replace(/\s*\(\d+\)\s*$/g, "")
    .replace(/\bcon\s+spray\b/g, " ")
    .replace(/\bspray\b/g, " ")
    .replace(/\bspary\b/g, " ")
    .replace(/\bgorrito\b/g, " ")
    .replace(/\bnavidad\b/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getModelGallery(group) {
  const christmasImages = [];
  const normalImages = [];
  const sprayImages = [];
  const normalKeys = new Set();

  (group?.variants || []).forEach(variant => {
    if (isChristmasSeason() && variant.christmasImage) {
      christmasImages.push(variant.christmasImage);
    }

    if (variant.image) {
      normalImages.push(variant.image);
      normalKeys.add(
        [
          normalizeValue(group.model),
          normalizeValue(variant.color),
          normalizeImageBaseName(variant.image)
        ].join("::")
      );
    }
  });

  (group?.variants || []).forEach(variant => {
    if (variant.secondaryImage) {
      const sprayKey = [
        normalizeValue(group.model),
        normalizeValue(variant.color),
        normalizeImageBaseName(variant.secondaryImage)
      ].join("::");

      if (!normalKeys.has(sprayKey)) {
        sprayImages.push(variant.secondaryImage);
      }
    }
  });

  return [
    ...new Set([
      ...christmasImages,
      ...normalImages,
      ...sprayImages
    ])
  ];
}


function getMainProductImage(product) {

  if (product?.variants) {

    return getModelGallery(product)[0];

  }

  if (
    isChristmasSeason() &&
    product.christmasImage
  ) {

    return product.christmasImage;

  }


  return product.image;

}


function setDialogImage(
  product,
  imagePath
) {

  dialogImage.src =
    encodeImagePath(imagePath);

  dialogImage.alt =
    `${product.brand} ${product.model}`;


  dialogThumbnails
    .querySelectorAll(".dialog-thumbnail")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.image === imagePath
      );

    });

}


function renderDialogGallery(product) {

  const gallery =
    product?.variants
      ? getModelGallery(product)
      : getProductGallery(product);


  if (gallery.length <= 1) {

    dialogThumbnails.innerHTML = "";

    dialogThumbnails.hidden = true;

    return;

  }


  dialogThumbnails.hidden = false;

  dialogThumbnails.innerHTML =

    gallery

      .map((imagePath, index) => `

        <button
          class="dialog-thumbnail ${
            index === 0
              ? "active"
              : ""
          }"
          data-image="${imagePath}"
          type="button"
          aria-label="Ver imagen ${index + 1}"
        >
          <img
            src="${encodeImagePath(imagePath)}"
            alt=""
            loading="lazy"
            decoding="async"
          >
        </button>

      `)

      .join("");


  dialogThumbnails
    .querySelectorAll(".dialog-thumbnail")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          setDialogImage(
            product,
            button.dataset.image
          );

        }
      );

    });

}


// ============================================
// ASIGNACIÓN DE VENDEDOR
// ============================================

// ============================================
// VARIANTES AGRUPADAS
// ============================================

function normalizeValue(value = "") {
  return value.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isGenericColorLabel(color = "") {
  if (typeof isGenericColorName === "function") {
    return isGenericColorName(color);
  }

  return normalizeValue(color).includes("consulta colores");
}

function getSpecificVariants(group) {
  return (group?.variants || [])
    .filter(variant => !isGenericColorLabel(variant.color));
}

function getGenericVariants(group) {
  return (group?.variants || [])
    .filter(variant => isGenericColorLabel(variant.color));
}

function getSelectableVariants(group) {
  const specificVariants =
    getSpecificVariants(group);

  return specificVariants.length
    ? specificVariants
    : getGenericVariants(group);
}

function getGroupKey(product) {
  return [product.brand, product.model, product.category, product.segment || ""].map(value => normalizeValue(value)).join("::");
}

function createGroupId(product) {
  return [product.brand, product.model, product.category, product.segment || ""]
    .map(value => normalizeValue(value))
    .join("-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function groupProductVariants(sourceProducts) {
  const groups = [];
  const groupMap = new Map();

  sourceProducts.forEach(product => {
    const key = getGroupKey(product);

    if (!groupMap.has(key)) {
      const group = {
        id: createGroupId(product),
        groupId: createGroupId(product),
        brand: product.brand,
        model: product.model,
        category: product.category,
        segment: product.segment,
        price: product.price,
        variants: []
      };

      groupMap.set(key, group);
      groups.push(group);
    }

    groupMap.get(key).variants.push({
      sourceId: product.id,
      id: product.id,
      brand: product.brand,
      model: product.model,
      color: product.color,
      capacity: product.capacity,
      category: product.category,
      segment: product.segment,
      price: product.price,
      image: product.image,
      secondaryImage: product.secondaryImage,
      christmasImage: product.christmasImage
    });
  });

  groups.forEach(group => {
    group.variants.sort(compareProductsNewestFirst);
    const coverVariant = getCoverVariant(group);
    group.color = getColorSummary(group);
    group.capacity = getCapacitySummary(group);
    group.image = coverVariant?.image;
    group.secondaryImage = coverVariant?.secondaryImage;
    group.christmasImage = coverVariant?.christmasImage;
  });

  return groups;
}

function getCoverVariant(group) {
  if (!group?.variants?.length) return null;

  const coverVariants =
    getSelectableVariants(group);

  if (isChristmasSeason()) {
    return coverVariants.find(variant => variant.christmasImage) ||
      coverVariants.find(variant => variant.image) ||
      coverVariants.find(variant => variant.secondaryImage) ||
      coverVariants[0] ||
      group.variants[0];
  }

  return coverVariants.find(variant => variant.image) ||
    coverVariants.find(variant => variant.secondaryImage) ||
    coverVariants[0] ||
    group.variants[0];
}

function getUniqueValues(values) {
  return [...new Set(values.filter(Boolean).map(value => value.trim()))];
}

function getColorSummary(group) {
  return "Colores disponibles";
}

function getCapacitySummary(group) {
  const capacities = getUniqueValues(
    group.variants
      .map(variant => variant.capacity)
      .filter(capacity => capacity && capacity !== "Pregunta por capacidad")
  );

  return capacities.length
    ? capacities.join(" · ")
    : "Consulta capacidades disponibles";
}

function getVariantCountLabel(group) {
  return "Colores disponibles";
}

function getDisplayColorLabel(color = "") {
  if (typeof getColorLabel === "function") {
    return getColorLabel(color);
  }

  return isGenericColorLabel(color)
    ? "Consulta colores disponibles"
    : color;
}

function getBasicColorDot(color = "") {
  if (typeof getColorSwatch === "function") {
    return getColorSwatch(color);
  }

  return "";
}


function updateDialogProduct(group) {
  renderDialogGallery(group);

  setDialogImage(
    group,
    getMainProductImage(group)
  );

  document.querySelector("#dialogCapacity").textContent =
    group.capacity || "Consulta capacidades disponibles";

  document.querySelector("#dialogPrice").textContent =
    group.price || "Consultar";
}


async function getAssignedSeller() {

  const response = await fetch(
    CONFIG.supabaseFunctionUrl,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.supabasePublishableKey
      },

      body: JSON.stringify({})
    }
  );


  let result;


  try {

    result = await response.json();

  } catch {

    throw new Error(
      "La función respondió con un formato no válido."
    );

  }


  if (
    !response.ok ||
    !result.ok ||
    !result.vendedor?.telefono
  ) {

    throw new Error(
      result.error ||
      "No se pudo asignar un vendedor."
    );

  }


  return result.vendedor;

}


// ============================================
// MENSAJE DE WHATSAPP
// ============================================

function createWhatsappMessage(product = null) {

  if (product) {

    return (
      `Hola, vi el ${product.model} en el catálogo de PhoneDepot. ` +
      `Quisiera consultar colores, capacidades y disponibilidad.`
    );

    if (
      product.whatsappMode === "model" ||
      isGenericColorLabel(product.color)
    ) {

      return (
        `Hola, vi el ${product.model} en el catálogo de PhoneDepot. ` +
        `Quisiera consultar colores y disponibilidad.`
      );

    }


    return (
      `Hola, vi el ${product.model} ` +
      `en color ${getDisplayColorLabel(product.color)} en el catálogo de PhoneDepot. ` +
      `¿Lo tienen disponible?`
    );

    return (
      `Hola, vi el ${product.model} ` +
      `(${product.color}) en el catálogo de PhoneDepot. ` +
      `¿Lo tienen disponible?`
    );

  }


  return (
    `Hola, vi el catálogo de PhoneDepot. ` +
    `Quisiera recibir información sobre los equipos disponibles.`
  );

}


// ============================================
// PRECARGAR VENDEDOR
// ============================================

function preloadSeller() {

  if (
    preloadedSeller ||
    sellerPreloadPromise
  ) {

    return sellerPreloadPromise;

  }


  sellerPreloadPromise =
    getAssignedSeller()

      .then(seller => {

        preloadedSeller =
          seller;

        return seller;

      })

      .catch(error => {

        console.warn(
          "No se pudo precargar vendedor:",
          error
        );

        return null;

      })

      .finally(() => {

        sellerPreloadPromise =
          null;

      });


  return sellerPreloadPromise;

}


// ============================================
// ABRIR WHATSAPP
// ============================================

async function openWhatsapp(
  product = null,
  triggerElement = null
) {

  const originalText =
    triggerElement?.textContent;


  /*
   * Abrimos la ventana antes del await
   * para evitar bloqueos del navegador.
   */

  const popup =
    window.open(
      "about:blank",
      "_blank"
    );


  if (triggerElement) {

    triggerElement.classList.add(
      "is-assigning"
    );

    triggerElement.setAttribute(
      "aria-busy",
      "true"
    );

    triggerElement.textContent =
      "⏳ Asignando asesor...";

  }


  try {

    /*
     * Supabase asigna:
     *
     * Iveth
     * Fer
     * Giant
     * Danilo
     *
     * según la lógica configurada
     * en la base de datos.
     */

    const seller =
      preloadedSeller ||
      await getAssignedSeller();


    preloadedSeller =
      null;


    const message =
      createWhatsappMessage(product);


    const whatsappUrl =
      `https://wa.me/${seller.telefono}` +
      `?text=${encodeURIComponent(message)}`;


    if (popup) {

      popup.location.href =
        whatsappUrl;

    } else {

      window.location.href =
        whatsappUrl;

    }


  } catch (error) {

    console.error(
      "Error al asignar vendedor:",
      error
    );


    if (popup) {

      popup.close();

    }


    alert(
      "No se pudo asignar un vendedor en este momento. " +
      "Intenta nuevamente."
    );


  } finally {

    if (triggerElement) {

      triggerElement.classList.remove(
        "is-assigning"
      );

      triggerElement.removeAttribute(
        "aria-busy"
      );

      triggerElement.textContent =
        originalText;

    }


    preloadSeller();

  }

}


// ============================================
// CATEGORÍAS
// ============================================

function renderCategories() {

  categoryFilters.innerHTML =

    brandCategories

      .map(brand => `

        <button

          class="brand-chip ${
            brand.name === activeCategory
              ? "active"
              : ""
          }"

          data-category="${brand.name}"

          aria-pressed="${
            brand.name === activeCategory
              ? "true"
              : "false"
          }"

          type="button"

        >

          <span
            class="brand-chip-logo ${
              BRAND_LOGOS[brand.name]
                ? ""
                : "brand-chip-logo-fallback"
            } ${
              brand.name === "Google"
                ? "brand-chip-logo-color"
                : ""
            }"
            data-fallback="${brand.logo || brand.name.charAt(0)}"
          >
            ${
              BRAND_LOGOS[brand.name]
                ? `
                  <img
                    src="${BRAND_LOGOS[brand.name]}"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  >
                `
                : brand.logo || brand.name.charAt(0)
            }
          </span>

          <span class="brand-chip-name">
            ${brand.name}
          </span>

        </button>

      `)

      .join("");


  bindBrandLogoFallbacks();


  categoryFilters
    .querySelectorAll(".brand-chip")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          activeCategory =
            button.dataset.category;

          renderCategories();

          renderProducts();

          updateBrandScrollButtons();

        }
      );

    });


  updateBrandScrollButtons();

}


function bindBrandLogoFallbacks() {

  categoryFilters
    .querySelectorAll(".brand-chip-logo img")
    .forEach(image => {

      image.addEventListener(
        "error",
        () => {

          const logo =
            image.closest(
              ".brand-chip-logo"
            );


          if (!logo) {

            return;

          }


          logo.textContent =
            logo.dataset.fallback ||
            "";

          logo.classList.add(
            "brand-chip-logo-fallback"
          );

        },
        {
          once: true
        }
      );

    });

}


function updateBrandScrollButtons() {

  if (
    !brandScrollLeft ||
    !brandScrollRight
  ) {

    return;

  }


  const hasOverflow =
    categoryFilters.scrollWidth >
    categoryFilters.clientWidth + 1;

  const isDesktop =
    window.matchMedia(
      "(min-width: 761px)"
    ).matches;

  const showButtons =
    hasOverflow &&
    isDesktop;


  brandScrollLeft.hidden =
    !showButtons;

  brandScrollRight.hidden =
    !showButtons;


  if (!showButtons) {

    return;

  }


  const maxScroll =
    categoryFilters.scrollWidth -
    categoryFilters.clientWidth;

  brandScrollLeft.disabled =
    categoryFilters.scrollLeft <= 0;

  brandScrollRight.disabled =
    categoryFilters.scrollLeft >=
    maxScroll - 1;

}


function scrollBrandFilters(direction) {

  const distance =
    categoryFilters.clientWidth * 0.7;

  categoryFilters.scrollBy({
    left:
      direction * distance,
    behavior:
      "smooth"
  });

}


// ============================================
// ORDEN DE PRODUCTOS
// ============================================

const PREFERRED_BRAND_ORDER = [
  "Samsung",
  "Apple",
  "Google",
  "Motorola",
  "OnePlus"
];


function getProductSortData(product) {

  const model =
    product.model || "";

  const normalizedModel =
    model
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const numbers =
    normalizedModel
      .match(/\d+/g)
      ?.map(Number)
      .filter(number => number < 1000) ||
    [];

  const years =
    normalizedModel
      .match(/\b20\d{2}\b/g)
      ?.map(Number) ||
    [];

  const generation =
    inferProductGeneration(
      product,
      normalizedModel,
      numbers,
      years
    );

  const variant =
    inferProductVariant(
      normalizedModel
    );

  const family =
    inferProductFamily(
      product,
      normalizedModel
    );


  return {
    generation,
    variant,
    family,
    modelKey:
      normalizedModel,
    colorKey:
      (
        product.color ||
        ""
      ).toLowerCase()
  };

}


function inferProductGeneration(
  product,
  normalizedModel,
  numbers,
  years
) {

  const firstNumber =
    numbers[0] || 0;


  if (
    product.brand === "Apple" &&
    normalizedModel.includes("iphone")
  ) {

    if (/\biphone\s*xr\b/.test(normalizedModel)) return 2018;
    if (/\biphone\s*xs\b/.test(normalizedModel)) return 2018;
    if (/\biphone\s*x\b/.test(normalizedModel)) return 2017;
    if (
      normalizedModel.includes("se") &&
      years.length
    ) return Math.max(...years);

    return firstNumber ?
      2008 + firstNumber :
      0;

  }


  if (
    product.brand === "OnePlus" &&
    normalizedModel.includes("open")
  ) {

    return 2023;

  }


  if (product.brand === "OnePlus") {

    return firstNumber ?
      2012 + firstNumber :
      0;

  }


  if (
    product.brand === "Apple" &&
    normalizedModel.includes("watch")
  ) {

    const watchSeries =
      normalizedModel.match(/\bs(\d+)\b/);

    if (watchSeries) {

      return 2014 +
        Number(watchSeries[1]);

    }

    if (normalizedModel.includes("se 2da")) return 2022;
    if (normalizedModel.includes("se")) return 2020;

    return normalizedModel.includes("ultra") ?
      2022 :
      0;

  }


  if (
    product.brand === "Apple" &&
    normalizedModel.includes("ipad")
  ) {

    return Math.max(...numbers, 0) || 0;

  }


  if (
    product.brand === "Samsung" &&
    normalizedModel.includes("galaxy z")
  ) {

    return firstNumber ?
      2018 + firstNumber :
      0;

  }


  if (
    product.brand === "Samsung" &&
    normalizedModel.includes("galaxy s")
  ) {

    return firstNumber ?
      2000 + firstNumber :
      0;

  }


  if (
    product.brand === "Samsung" &&
    /\bgalaxy a\d+/.test(normalizedModel)
  ) {

    return 2000 +
      (
        firstNumber % 10
      );

  }


  if (product.brand === "Google") {

    if (normalizedModel.includes("fold")) return 2023;

    return firstNumber ?
      2015 + firstNumber :
      0;

  }


  if (
    product.brand === "Motorola" &&
    normalizedModel.includes("edge")
  ) {

    return firstNumber ?
      1974 + firstNumber :
      0;

  }


  if (
    product.brand === "Motorola" &&
    normalizedModel.includes("razr")
  ) {

    return firstNumber ?
      1974 + firstNumber :
      0;

  }


  return Math.max(
    ...numbers,
    ...years,
    0
  );

}


function inferProductVariant(normalizedModel) {

  const foldableRank =
    inferFoldableVariant(
      normalizedModel
    );

  if (foldableRank) {

    return foldableRank;

  }


  if (normalizedModel.includes("ultra")) return 100;
  if (normalizedModel.includes("pro max")) return 90;
  if (normalizedModel.includes("pro xl")) return 86;
  if (normalizedModel.includes(" pro")) return 82;
  if (normalizedModel.includes("plus") || normalizedModel.includes("+")) return 70;
  if (normalizedModel.includes("fe")) return 45;
  if (normalizedModel.includes("mini")) return 35;
  if (/\b\d+a\b/.test(normalizedModel)) return 25;
  if (/\d+e\b/.test(normalizedModel)) return 24;
  if (normalizedModel.includes("lite")) return 20;

  return 60;

}


function inferFoldableVariant(normalizedModel) {

  if (normalizedModel.includes("fold")) return 95;
  if (normalizedModel.includes("flip")) return 90;
  if (normalizedModel.includes("open")) return 85;
  if (
    normalizedModel.includes("razr") &&
    normalizedModel.includes("ultra")
  ) return 80;
  if (normalizedModel.includes("razr")) return 75;

  return 0;

}


function inferProductFamily(
  product,
  normalizedModel
) {

  if (product.segment === "Plegables") return 900;
  if (normalizedModel.includes("iphone")) return 850;
  if (normalizedModel.includes("galaxy s")) return 830;
  if (normalizedModel.includes("pixel")) return 820;
  if (normalizedModel.includes("edge")) return 810;
  if (normalizedModel.includes("moto g")) return 780;
  if (normalizedModel.includes("oneplus")) return 770;
  if (normalizedModel.includes("ipad") || normalizedModel.includes("tab")) return 650;
  if (normalizedModel.includes("watch")) return 550;

  return 500;

}


function compareProductsNewestFirst(a, b) {

  const left =
    getProductSortData(a);

  const right =
    getProductSortData(b);


  return (
    right.generation - left.generation ||
    right.variant - left.variant ||
    right.family - left.family ||
    left.modelKey.localeCompare(
      right.modelKey,
      "es",
      {
        numeric: true
      }
    ) ||
    left.colorKey.localeCompare(
      right.colorKey,
      "es",
      {
        numeric: true
      }
    )
  );

}


function getModelGroupKey(product) {

  return [
    product.brand || "",
    product.model || ""
  ]
    .join("::")
    .toLowerCase();

}


function groupProductsByModel(productList) {

  const groups =
    [];

  const groupMap =
    new Map();


  productList.forEach(
    product => {

      const key =
        getModelGroupKey(product);

      if (!groupMap.has(key)) {

        const group = {
          brand:
            product.brand || "",
          products:
            []
        };

        groupMap.set(
          key,
          group
        );

        groups.push(group);

      }


      groupMap
        .get(key)
        .products
        .push(product);

    }
  );


  return groups;

}


function interleaveBrandGroups(
  productList,
  brandOrder
) {

  const groups =
    groupProductsByModel(productList);

  const buckets =
    new Map();


  groups.forEach(
    group => {

      if (!buckets.has(group.brand)) {

        buckets.set(
          group.brand,
          []
        );

      }


      buckets
        .get(group.brand)
        .push(group);

    }
  );


  const orderedBrands = [
    ...brandOrder,
    ...[...buckets.keys()]
      .filter(
        brand => !brandOrder.includes(brand)
      )
  ];

  const interleaved =
    [];


  while (
    [...buckets.values()]
      .some(brandGroups => brandGroups.length)
  ) {

    orderedBrands.forEach(
      brand => {

        const brandGroups =
          buckets.get(brand);

        if (
          !brandGroups ||
          !brandGroups.length
        ) {

          return;

        }


        interleaved.push(
          ...brandGroups.shift().products
        );

      }
    );

  }


  return interleaved;

}


// ============================================
// FILTRAR PRODUCTOS
// ============================================

function filteredProducts() {

  const query =
    searchInput.value
      .trim()
      .toLowerCase();


  const list =
    products.filter(
    product => {


      const searchableText = [

        product.brand,

        product.model,

        product.color,

        product.capacity,

        product.category,

        product.segment,

        ...(product.variants || [])
          .flatMap(variant => [
            variant.sourceId,
            variant.color,
            variant.capacity,
            variant.image
          ])

      ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();


      const matchesQuery =
        searchableText.includes(query);


      const matchesCategory =

        activeCategory === "Todos" ||

        (
          activeCategory === "Plegables" &&
          product.segment === "Plegables"
        ) ||

        product.brand ===
          activeCategory;


      return (
        matchesQuery &&
        matchesCategory
      );

    }
    )
    .sort(compareProductsNewestFirst);


  if (
    activeCategory === "Todos" ||
    activeCategory === "Plegables"
  ) {

    return interleaveBrandGroups(
      list,
      PREFERRED_BRAND_ORDER
    );

  }


  return list;

}


// ============================================
// RENDER PRODUCTOS
// ============================================

function renderProducts() {

  const list =
    filteredProducts();


  resultCount.textContent =

    `${list.length} ${
      list.length === 1
        ? "modelo"
        : "modelos"
    }`;


  emptyState.hidden =
    list.length > 0;


  grid.innerHTML =

    list

      .map(product => `

        <article
          class="product-card model-card"
          data-open="${product.id}"
          tabindex="0"
          aria-label="Ver ${product.brand} ${product.model}"
        >


          <div

            class="product-image-wrap"

          >

            <img

              src="${encodeImagePath(getMainProductImage(product))}"

              alt="${product.brand} ${product.model}"

              loading="lazy"

              decoding="async"

            >

          </div>


          <div
            class="product-body"
          >


            <p
              class="product-brand"
            >

              ${product.brand}

            </p>


            <h3
              class="product-title"
            >

              ${product.model}

            </h3>


            <p
              class="product-meta"
            >

              Colores disponibles

              ${
                product.capacity
                  ? `<br>${product.capacity}`
                  : ""
              }

            </p>

            <div
              class="product-actions"
            >


              <button

                class="whatsapp-product-button"

                data-whatsapp="${product.id}"

                type="button"

              >

                Consultar

              </button>


              <button

                class="details-button"

                type="button"

              >

                Ver equipo

              </button>


            </div>


          </div>


        </article>

      `)

      .join("");


  // ============================================
  // BOTONES PARA ABRIR DETALLES
  // ============================================

  grid
    .querySelectorAll(".product-card")
    .forEach(element => {

      element.addEventListener(
        "click",
        event => {

          if (
            event.target.closest(
              "[data-whatsapp]"
            ) ||
            event.target.closest(
              "button"
            )
          ) {

            return;

          }


          openProduct(
            element.dataset.open
          );

        }
      );


      element.addEventListener(
        "keydown",
        event => {

          if (
            event.key !== "Enter" &&
            event.key !== " "
          ) {

            return;

          }


          event.preventDefault();

          openProduct(
            element.dataset.open
          );

        }
      );

    });


  grid
    .querySelectorAll(".details-button")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          openProduct(
            button.closest(".product-card").dataset.open
          );

        }
      );

    });


  // ============================================
  // BOTONES DE WHATSAPP
  // ============================================

  grid
    .querySelectorAll("[data-whatsapp]")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();


          const product =
            products.find(
              item =>
                item.id ===
                button.dataset.whatsapp
            );


          if (!product) {

            return;

          }


          openWhatsapp(
            {
              ...product,
              whatsappMode: "model"
            },
            button
          );

        }
      );

    });

}


// ============================================
// ABRIR PRODUCTO
// ============================================

function openProduct(id) {

  const group =
    products.find(
      item =>
        item.id === id
    );


  if (!group) {

    return;

  }


  dialogProductId =
    group.id;

  document.querySelector(
    "#dialogBrand"
  ).textContent =

    group.brand;


  document.querySelector(
    "#dialogModel"
  ).textContent =

    group.model;


  updateDialogProduct(group);

  if (dialogGoogleMaps) {
    dialogGoogleMaps.href =
      CONFIG.googleMapsUrl;
  }


  document.body.classList.add("modal-open");

  dialog.showModal();

}


// ============================================
// WHATSAPP DEL MODAL
// ============================================

dialogWhatsapp.addEventListener(
  "click",
  event => {

    event.preventDefault();


    const group =
      products.find(
        item =>
          item.id ===
          dialogProductId
      );


    if (!group) {

      return;

    }


    openWhatsapp(
      group,
      dialogWhatsapp
    );

  }
);


// ============================================
// CERRAR MODAL
// ============================================

document
  .querySelector("#closeDialog")
  .addEventListener(
    "click",
    () => {

      dialog.close();

    }
  );


dialog.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      dialog
    ) {

      dialog.close();

    }

  }
);


dialog.addEventListener(
  "close",
  () => {

    document.body.classList.remove("modal-open");

  }
);


dialog.addEventListener(
  "cancel",
  () => {

    document.body.classList.remove("modal-open");

  }
);


// ============================================
// BÚSQUEDA
// ============================================

searchInput.addEventListener(
  "input",
  renderProducts
);


categoryFilters.addEventListener(
  "scroll",
  updateBrandScrollButtons
);


categoryFilters.addEventListener(
  "keydown",
  event => {

    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End"
      ].includes(event.key)
    ) {

      return;

    }


    const buttons = [
      ...categoryFilters.querySelectorAll(
        ".brand-chip"
      )
    ];

    const currentIndex =
      buttons.indexOf(
        document.activeElement
      );


    if (currentIndex === -1) {

      return;

    }


    event.preventDefault();


    let nextIndex =
      currentIndex;


    if (event.key === "ArrowLeft") {

      nextIndex =
        Math.max(
          0,
          currentIndex - 1
        );

    }


    if (event.key === "ArrowRight") {

      nextIndex =
        Math.min(
          buttons.length - 1,
          currentIndex + 1
        );

    }


    if (event.key === "Home") {

      nextIndex =
        0;

    }


    if (event.key === "End") {

      nextIndex =
        buttons.length - 1;

    }


    buttons[nextIndex].focus();

    buttons[nextIndex].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest"
    });

  }
);


window.addEventListener(
  "resize",
  updateBrandScrollButtons
);


if (brandScrollLeft) {

  brandScrollLeft.addEventListener(
    "click",
    () => {

      scrollBrandFilters(-1);

    }
  );

}


if (brandScrollRight) {

  brandScrollRight.addEventListener(
    "click",
    () => {

      scrollBrandFilters(1);

    }
  );

}


// ============================================
// BOTONES GENERALES DE WHATSAPP
// ============================================

[
  "topWhatsapp",
  "floatingWhatsapp",
  "footerWhatsapp"
]

.forEach(id => {

  const button =
    document.querySelector(
      `#${id}`
    );


  if (!button) {

    return;

  }


  button.addEventListener(
    "click",
    event => {

      event.preventDefault();


      openWhatsapp(
        null,
        button
      );

    }
  );

});


// ============================================
// GOOGLE MAPS
// ============================================

[
  "topGoogleMaps",
  "heroGoogleMaps",
  "footerGoogleMaps"
]

.forEach(id => {

  const button =
    document.querySelector(
      `#${id}`
    );


  if (!button) {

    return;

  }


  button.href =
    CONFIG.googleMapsUrl;

});


preloadSeller();


// ============================================
// CARGAR CATÁLOGO
// ============================================

fetch("products.json")

  .then(response => {

    if (!response.ok) {

      throw new Error(
        "No se pudo cargar products.json"
      );

    }


    return response.json();

  })


  .then(data => {

    productVariants = data;

    products =
      groupProductVariants(data);

    console.info(
      "Catalogo agrupado:",
      {
        variantes:
          productVariants.length,
        modelos:
          products.length
      }
    );


    renderCategories();


    renderProducts();

  })


  .catch(error => {

    console.error(error);


    grid.innerHTML = `

      <div class="load-error">

        <h3>
          No se pudo cargar el catálogo
        </h3>

        <p>
          Intenta recargar la página.
        </p>

      </div>

    `;

  });
