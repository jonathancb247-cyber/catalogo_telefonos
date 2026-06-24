
const CONFIG = {
  storeName: "Selección Premium",
  supabaseFunctionUrl:
    "https://rhcilyuwsljhayygartt.supabase.co/functions/v1/asignar-vendedor",
  supabasePublishableKey:
    "sb_publishable_NkU48ucQy6-Z05YJSsaduQ_WdUzygWp"
};

let products = [];
let activeCategory = "Todos";
let dialogProductId = null;

const grid = document.querySelector("#productGrid");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const categoryFilters = document.querySelector("#categoryFilters");
const resultCount = document.querySelector("#resultCount");
const emptyState = document.querySelector("#emptyState");
const dialog = document.querySelector("#productDialog");
const dialogWhatsapp = document.querySelector("#dialogWhatsapp");

/**
 * Solicita a Supabase el siguiente vendedor disponible.
 */
async function getAssignedSeller() {
  const response = await fetch(CONFIG.supabaseFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CONFIG.supabasePublishableKey
    },
    body: JSON.stringify({})
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("La función respondió con un formato no válido.");
  }

  if (!response.ok || !result.ok || !result.vendedor?.telefono) {
    throw new Error(
      result.error || "No se pudo asignar un vendedor."
    );
  }

  return result.vendedor;
}

/**
 * Crea el mensaje para un producto o para una consulta general.
 */
function createWhatsappMessage(product = null) {
  if (product) {
    return (
      `Hola, vi el ${product.model} (${product.color}) ` +
      `en el catálogo. ¿Sigue disponible?`
    );
  }

  return (
    `Hola, vi el catálogo de ${CONFIG.storeName}. ` +
    `Quisiera recibir información.`
  );
}

/**
 * Solicita vendedor y abre WhatsApp.
 *
 * La pestaña se abre antes del await para evitar que el navegador
 * la bloquee como ventana emergente.
 */
async function openWhatsapp(product = null, triggerElement = null) {
  const originalText = triggerElement?.textContent;
  const popup = window.open("about:blank", "_blank");

  if (triggerElement) {
    triggerElement.disabled = true;
    triggerElement.textContent = "Asignando...";
  }

  try {
    const seller = await getAssignedSeller();
    const message = createWhatsappMessage(product);

    const whatsappUrl =
      `https://wa.me/${seller.telefono}` +
      `?text=${encodeURIComponent(message)}`;

    if (popup) {
      popup.location.href = whatsappUrl;
    } else {
      window.location.href = whatsappUrl;
    }
  } catch (error) {
    console.error("Error al asignar vendedor:", error);

    if (popup) {
      popup.close();
    }

    alert(
      "No se pudo asignar un vendedor en este momento. " +
      "Intenta nuevamente."
    );
  } finally {
    if (triggerElement) {
      triggerElement.disabled = false;
      triggerElement.textContent = originalText;
    }
  }
}

function renderCategories() {
  const categories = [
    "Todos",
    ...new Set(products.map(product => product.category))
  ];

  categoryFilters.innerHTML = categories
    .map(category => `
      <button
        class="chip ${category === activeCategory ? "active" : ""}"
        data-category="${category}"
        type="button"
      >
        ${category}
      </button>
    `)
    .join("");

  categoryFilters.querySelectorAll(".chip").forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      renderCategories();
      renderProducts();
    });
  });
}

function filteredProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  return products.filter(product => {
    const searchableText = [
      product.brand,
      product.model,
      product.color,
      product.category
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = searchableText.includes(query);

    const matchesCategory =
      activeCategory === "Todos" ||
      product.category === activeCategory;

    const matchesStatus =
      status === "Todos" ||
      product.status === status;

    return matchesQuery && matchesCategory && matchesStatus;
  });
}

function renderProducts() {
  const list = filteredProducts();

  resultCount.textContent =
    `${list.length} ${list.length === 1 ? "equipo" : "equipos"}`;

  emptyState.hidden = list.length > 0;

  grid.innerHTML = list
    .map(product => `
      <article class="product-card">
        <div
          class="product-image-wrap"
          data-open="${product.id}"
        >
          <img
            src="assets/${product.image}"
            alt="${product.brand} ${product.model}"
            loading="lazy"
          >

          <span class="badge ${product.status.toLowerCase()}">
            ${product.status}
          </span>
        </div>

        <div class="product-body">
          <p class="product-brand">${product.brand}</p>

          <h3 class="product-title">
            ${product.model}
          </h3>

          <p class="product-meta">
            ${product.color}<br>
            ${product.capacity}
          </p>

          <div class="product-actions">
            <button
              class="whatsapp-product-button"
              data-whatsapp="${product.id}"
              type="button"
            >
              Consultar
            </button>

            <button
              class="details-button"
              data-open="${product.id}"
              type="button"
            >
              Ver
            </button>
          </div>
        </div>
      </article>
    `)
    .join("");

  grid.querySelectorAll("[data-open]").forEach(element => {
    element.addEventListener("click", event => {
      if (event.target.closest("[data-whatsapp]")) {
        return;
      }

      openProduct(element.dataset.open);
    });
  });

  grid.querySelectorAll("[data-whatsapp]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();

      const product = products.find(
        item => item.id === button.dataset.whatsapp
      );

      if (!product) {
        return;
      }

      openWhatsapp(product, button);
    });
  });
}

function openProduct(id) {
  const product = products.find(item => item.id === id);

  if (!product) {
    return;
  }

  dialogProductId = product.id;

  document.querySelector("#dialogImage").src =
    `assets/${product.image}`;

  document.querySelector("#dialogImage").alt =
    `${product.brand} ${product.model}`;

  document.querySelector("#dialogBrand").textContent =
    product.brand;

  document.querySelector("#dialogModel").textContent =
    product.model;

  document.querySelector("#dialogColor").textContent =
    product.color;

  document.querySelector("#dialogCapacity").textContent =
    product.capacity;

  document.querySelector("#dialogStatus").textContent =
    product.status;

  document.querySelector("#dialogPrice").textContent =
    product.price;

  /*
   * Quitamos el enlace fijo porque el número se obtiene
   * dinámicamente al hacer clic.
   */
  dialogWhatsapp.href = "#";

  dialog.showModal();
}

/**
 * Botón de WhatsApp dentro del modal.
 */
dialogWhatsapp.addEventListener("click", event => {
  event.preventDefault();

  const product = products.find(
    item => item.id === dialogProductId
  );

  if (!product) {
    return;
  }

  openWhatsapp(product, dialogWhatsapp);
});

/**
 * Cerrar modal.
 */
document
  .querySelector("#closeDialog")
  .addEventListener("click", () => {
    dialog.close();
  });

dialog.addEventListener("click", event => {
  if (event.target === dialog) {
    dialog.close();
  }
});

/**
 * Filtros.
 */
searchInput.addEventListener("input", renderProducts);
statusFilter.addEventListener("change", renderProducts);

/**
 * Botones generales de WhatsApp.
 */
["topWhatsapp", "floatingWhatsapp"].forEach(id => {
  const button = document.querySelector(`#${id}`);

  if (!button) {
    return;
  }

  button.addEventListener("click", event => {
    event.preventDefault();
    openWhatsapp(null, button);
  });
});

/**
 * Cargar catálogo.
 */
fetch("products.json")
  .then(response => {
    if (!response.ok) {
      throw new Error("No se pudo cargar products.json");
    }

    return response.json();
  })
  .then(data => {
    products = data;
    renderCategories();
    renderProducts();
  })
  .catch(error => {
    console.error(error);

    grid.innerHTML = `
      <p>
        No se pudo cargar el catálogo.
        Intenta recargar la página.
      </p>
    `;
  });
```
