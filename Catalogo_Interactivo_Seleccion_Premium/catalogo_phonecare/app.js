
const CONFIG = {
  // Reemplaza con el número de WhatsApp del negocio, incluyendo lada y país, sin + ni espacios.
  // Ejemplo México: 5214491234567
  whatsappNumber: "5214491816971",
  storeName: "Selección Premium"
};

let products = [];
let activeCategory = "Todos";

const grid = document.querySelector("#productGrid");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const categoryFilters = document.querySelector("#categoryFilters");
const resultCount = document.querySelector("#resultCount");
const emptyState = document.querySelector("#emptyState");
const dialog = document.querySelector("#productDialog");

const waLink = (product) => {
  const message = product
    ? `Hola, vi el ${product.model} (${product.color}) en el catálogo. ¿Sigue disponible?`
    : `Hola, vi su catálogo de ${CONFIG.storeName}. Quisiera información.`;
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
};

function renderCategories() {
  const categories = ["Todos", ...new Set(products.map(p => p.category))];
  categoryFilters.innerHTML = categories.map(category =>
    `<button class="chip ${category === activeCategory ? "active" : ""}" data-category="${category}">${category}</button>`
  ).join("");

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
    const matchesQuery = [product.brand, product.model, product.color, product.category]
      .join(" ").toLowerCase().includes(query);
    const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
    const matchesStatus = status === "Todos" || product.status === status;
    return matchesQuery && matchesCategory && matchesStatus;
  });
}

function renderProducts() {
  const list = filteredProducts();
  resultCount.textContent = `${list.length} ${list.length === 1 ? "equipo" : "equipos"}`;
  emptyState.hidden = list.length > 0;

  grid.innerHTML = list.map(product => `
    <article class="product-card">
      <div class="product-image-wrap" data-open="${product.id}">
        <img src="assets/${product.image}" alt="${product.brand} ${product.model}" loading="lazy">
        <span class="badge ${product.status.toLowerCase()}">${product.status}</span>
      </div>
      <div class="product-body">
        <p class="product-brand">${product.brand}</p>
        <h3 class="product-title">${product.model}</h3>
        <p class="product-meta">${product.color}<br>${product.capacity}</p>
        <div class="product-actions">
          <a href="${waLink(product)}" target="_blank" rel="noopener">Consultar</a>
          <button class="details-button" data-open="${product.id}">Ver</button>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-open]").forEach(element => {
    element.addEventListener("click", event => {
      if (event.target.closest("a")) return;
      openProduct(element.dataset.open);
    });
  });
}

function openProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  document.querySelector("#dialogImage").src = `assets/${product.image}`;
  document.querySelector("#dialogImage").alt = `${product.brand} ${product.model}`;
  document.querySelector("#dialogBrand").textContent = product.brand;
  document.querySelector("#dialogModel").textContent = product.model;
  document.querySelector("#dialogColor").textContent = product.color;
  document.querySelector("#dialogCapacity").textContent = product.capacity;
  document.querySelector("#dialogStatus").textContent = product.status;
  document.querySelector("#dialogPrice").textContent = product.price;
  document.querySelector("#dialogWhatsapp").href = waLink(product);
  dialog.showModal();
}

document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});
searchInput.addEventListener("input", renderProducts);
statusFilter.addEventListener("change", renderProducts);

["topWhatsapp", "floatingWhatsapp"].forEach(id => {
  document.querySelector(`#${id}`).addEventListener("click", () => {
    window.open(waLink(), "_blank", "noopener");
  });
});

fetch("products.json")
  .then(response => response.json())
  .then(data => {
    products = data;
    renderCategories();
    renderProducts();
  })
  .catch(() => {
    grid.innerHTML = "<p>No se pudo cargar el catálogo. Abre el sitio mediante un servidor web o GitHub Pages.</p>";
  });
