# Catálogo interactivo — Selección Premium

## 1. Configura tu WhatsApp
Abre `app.js` y cambia:

```js
whatsappNumber: "5210000000000"
```

Usa el número con código de país, sin `+`, espacios ni guiones.

## 2. Edita equipos, precio y disponibilidad
Abre `products.json`.

Estados admitidos:
- Disponible
- Apartado
- Vendido

Ejemplo:
```json
"status": "Vendido",
"price": "$18,999"
```

## 3. Probar en tu computadora
No abras solamente `index.html`, porque algunos navegadores bloquean la lectura de JSON local.

En la carpeta ejecuta:

```bash
python -m http.server 8000
```

Y abre:
`http://localhost:8000`

## 4. Publicar gratis en GitHub Pages
1. Crea un repositorio.
2. Sube todos los archivos y la carpeta `assets`.
3. En GitHub entra a Settings → Pages.
4. Selecciona Deploy from a branch.
5. Elige `main` y `/root`.
6. Guarda. GitHub te dará el enlace público.

## Archivos principales
- `index.html`: estructura.
- `styles.css`: diseño.
- `app.js`: filtros, buscador, modal y WhatsApp.
- `products.json`: inventario.
- `assets/`: imágenes.
