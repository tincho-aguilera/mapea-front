# Mapea Frontend

Aplicación web para visualizar propiedades inmobiliarias en un mapa interactivo, desarrollada con SvelteKit y Tailwind CSS.

## Características

- Visualización de propiedades en mapa interactivo con Leaflet
- Filtrado por ubicación, ciudad y tipo de propiedad
- Integración con múltiples fuentes de datos inmobiliarios (Inmoup, MendozaProp, etc.)
- Interfaz de usuario moderna con Flowbite-Svelte
- Sistema de autenticación integrado

## Tecnologías

- **Framework**: SvelteKit 2.x
- **Estilos**: Tailwind CSS 4.x
- **Componentes UI**: Flowbite-Svelte
- **Mapas**: Leaflet
- **Despliegue**: Vercel

## Requisitos

- Node.js 18.x o superior
- pnpm (recomendado) o npm

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tincho-aguilera/mapea-front.git
cd mapea-front

# Instalar dependencias
pnpm install
```

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
VITE_API_URL=http://localhost:8000  # URL del backend (desarrollo)
```

Para producción, configura esta variable en tu proveedor de hosting (Vercel, Netlify, etc.)

## Desarrollo

Inicia el servidor de desarrollo:

```bash
pnpm dev

# o inicia el servidor y abre la app en una nueva pestaña del navegador
pnpm dev -- --open
```

## Compilación para producción

Para crear una versión de producción de la aplicación:

```bash
pnpm build
```

Puedes previsualizar la compilación de producción con `pnpm preview`.

## Despliegue

Este proyecto está configurado para despliegue automático con Vercel. Cada push a la rama principal activará un nuevo despliegue.

## Licencia

MIT
