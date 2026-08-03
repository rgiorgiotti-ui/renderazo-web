# Sitio Renderazo — cómo publicarlo conectado a Airtable

Esta carpeta tiene dos partes:

- `index.html` → el sitio en sí.
- `netlify/functions/get-data.js` → el "proxy": lee Airtable de forma segura y le pasa los datos al sitio.

Para que las funciones (el proxy) funcionen, **no alcanza con arrastrar la carpeta a netlify.com/drop** — hace falta conectar un repositorio de GitHub. Es más simple de lo que suena y no necesitás usar la terminal ni saber comandos de git.

## Paso 1 — Subir esta carpeta a GitHub (sin usar la terminal)

1. Entrá a [github.com](https://github.com) y creá una cuenta gratis si no tenés.
2. Hacé clic en el botón verde **"New"** (o el `+` de arriba a la derecha → "New repository").
3. Ponele un nombre, por ejemplo `renderazo-web`. Dejalo en **Public** o **Private**, cualquiera de las dos funciona igual para esto. Creá el repositorio.
4. Dentro del repositorio recién creado, hacé clic en **"Add file" → "Upload files"**.
5. Arrastrá **todos los archivos y carpetas** de esta carpeta (`index.html`, `netlify.toml`, la carpeta `netlify` completa) a esa pantalla.
6. Bajá y hacé clic en **"Commit changes"**.

## Paso 2 — Conectar ese repositorio a Netlify

1. Entrá a [app.netlify.com](https://app.netlify.com) y creá una cuenta gratis (podés usar tu cuenta de GitHub para entrar directo).
2. Hacé clic en **"Add new site" → "Import an existing project"**.
3. Elegí **GitHub** y autorizá el acceso.
4. Seleccioná el repositorio `renderazo-web` que acabás de crear.
5. Netlify va a detectar automáticamente la configuración gracias al archivo `netlify.toml`. No hace falta tocar nada en esta pantalla — hacé clic en **"Deploy site"**.
6. En un minuto vas a tener una URL tipo `algo-random.netlify.app`. Se puede cambiar el nombre desde **"Site settings" → "Change site name"** (ahí podés poner `renderazo.netlify.app` si está disponible).

## Paso 3 — Configurar las variables secretas (el token de Airtable)

Acá es donde vive la clave, nunca en el código:

1. Dentro del sitio en Netlify, andá a **"Site settings" → "Environment variables"**.
2. Agregá dos variables:
   - `AIRTABLE_TOKEN` → pegá acá tu Personal Access Token de Airtable (el que empieza con `pat...`).
   - `AIRTABLE_BASE_ID` → el ID de tu base "Base Renders". Lo encontrás abriendo tu base en Airtable y mirando la URL: es el texto que empieza con `app...` justo después de `airtable.com/`.
3. Guardá los cambios.
4. Como las variables se agregaron después del primer deploy, hace falta volver a desplegar para que la función las lea: andá a **"Deploys" → "Trigger deploy" → "Deploy site"**.

## Paso 4 — Probar que la conexión funciona

1. Abrí tu sitio (`tu-nombre.netlify.app`).
2. Si ves los datos reales que cargaste en Airtable (nombres de servicios, fotos de portfolio, etc.), ¡está funcionando!
3. Si en cambio ves los datos de ejemplo genéricos (NODO Renders, "Living moderno", etc.), algo no conectó bien. Para diagnosticarlo:
   - Abrí `tu-nombre.netlify.app/.netlify/functions/get-data` directamente en el navegador — debería mostrarte el JSON con tus datos reales. Si en cambio da un error, el mensaje te va a decir si falta alguna variable de entorno o si el nombre de alguna tabla en Airtable no coincide.

## Cómo se actualiza el sitio después

- **Cambiar precios, textos, imágenes de portfolio, videos**: se edita directo en Airtable. El sitio los va a reflejar solos la próxima vez que alguien lo visite (sin redeploy, sin tocar nada).
- **Cambiar el diseño (colores, textos fijos, estructura)**: hay que editar `index.html` y volver a subirlo a GitHub (Netlify redeploya solo cuando detecta el cambio).
