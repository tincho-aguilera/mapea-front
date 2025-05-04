<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    import { Spinner, Alert, Card, Button } from 'flowbite-svelte';
    import { InfoCircleSolid, ArrowRightOutline } from 'flowbite-svelte-icons';
    import { BasePropertyService } from '$lib/services/BasePropertyService';

    let map;
    let L;
    let results = 0; // Variable para contar los registros obtenidos
    let loading = false; // Estado de carga (inicialmente false ya que no cargamos automáticamente)
    let errormessage = ''; // Variable para manejar errores
    let error = false; // Variable para manejar errores
    let mapInitialized = false; // Variable para controlar si el mapa ya fue inicializado
    let searchInitiated = false; // Variable para saber si se ha iniciado una búsqueda
    let drawControl; // Control de dibujo para Leaflet
    let drawnItems; // Capas dibujadas
    let propertyService; // Servicio de propiedades actual

    // Mapia branding colors
    const mapiaColors = {
        primary: '#1ABFB0',      // Turquesa principal para Mapia
        house: '#1ABFB0',        // Turquesa para casas
        apartment: '#30D5C8',    // Variante turquesa más clara para departamentos
        usd: '#1ABFB0',          // Color principal para USD
        ars: '#38E4D6',          // Turquesa más claro para ARS
        default: '#1ABFB0'       // Color por defecto
    };

    // Helper function to detect currency and format price
    function detectCurrencyAndFormat(priceStr) {
        if (!priceStr) return { currency: 'unknown', numericPrice: 0, symbol: '?' };

        priceStr = priceStr.trim();
        let currency = 'ars'; // Default currency
        let symbol = '$';

        // Detect currency type
        if (priceStr.toLowerCase().includes('us') || priceStr.toLowerCase().includes('u$s') || priceStr.toLowerCase().includes('usd')) {
            currency = 'usd';
            symbol = 'US$';
        }

        // Extract numeric value
        const numericPrice = priceStr.replace(/[^\d]/g, '');

        return { currency, numericPrice, symbol };
    }

    // Helper function to format price for markers
    function formatPrice(priceStr) {
        const { numericPrice, currency, symbol } = detectCurrencyAndFormat(priceStr);

        // For short display on markers
        if (numericPrice >= 1000000) {
            return `$${Math.floor(numericPrice / 1000000)}M`;
        } else if (numericPrice >= 1000) {
            return `$${Math.floor(numericPrice / 1000)}K`;
        }
        return `$${numericPrice}`;
    }

    // Full price formatter for popups
    function formatFullPrice(priceStr) {
        const { numericPrice, currency, symbol } = detectCurrencyAndFormat(priceStr);

        // Format with currency symbol and thousand separators
        const formatted = new Intl.NumberFormat('es-ES', {
            style: 'decimal',
            maximumFractionDigits: 0
        }).format(numericPrice);

        return `${symbol} ${formatted}`;
    }

    // Helper function to determine property type
    function getPropertyType(property) {
        // Simplistic check - could be improved with actual data
        const title = (property.title || '').toLowerCase();
        if (title.includes('casa') || title.includes('chalet') || title.includes('villa')) {
            return 'house';
        }
        return 'apartment'; // Default to apartment
    }

    // Function to create a custom marker icon with price
    function createPriceMarker(priceStr, propertyType = 'default') {
        const { currency } = detectCurrencyAndFormat(priceStr);
        const shortPrice = priceStr ? formatPrice(priceStr) : '?';

        // Choose color based on currency
        const color = mapiaColors[currency] || mapiaColors.default;

        // Create a custom divIcon with the price
        return L.divIcon({
            className: 'custom-price-marker',
            html: `
                <div class="marker-container marker-${currency}">
                    <span class="price-tag">${shortPrice}</span>
                </div>
            `,
            iconSize: [80, 30],
            iconAnchor: [40, 15],
            popupAnchor: [0, -15]
        });
    }

    // Función que inicializa el mapa
    async function initializeMap() {
        if (browser && !mapInitialized) {
            try {
                // Importamos Leaflet
                const leaflet = await import('leaflet');
                L = leaflet.default || leaflet;

                // Importamos leaflet-draw - de manera que aseguremos que esté disponible en L
                await import('leaflet-draw');

                // Verificar si L.Draw está disponible
                if (!L.Draw) {
                    console.error('L.Draw no está disponible después de importar leaflet-draw');
                    // Definir los eventos mínimos necesarios si no están disponibles
                    L.Draw = L.Draw || {};
                    L.Draw.Event = L.Draw.Event || {
                        CREATED: 'draw:created',
                        EDITED: 'draw:edited',
                        DELETED: 'draw:deleted'
                    };
                }

                // Apply custom styles including the new marker styles
                const style = document.createElement('style');
                style.textContent = `
                    /* Custom popup styles */
                    .custom-popup .leaflet-popup-content-wrapper {
                        padding: 0;
                        border-radius: 8px;
                        overflow: hidden;
                        width: 300px;
                    }
                    .custom-popup .leaflet-popup-content {
                        margin: 0;
                        width: 300px !important;
                    }
                    .custom-popup .leaflet-popup-tip {
                        background: white;
                    }

                    /* Custom marker styles - updated to match reference image */
                    .custom-price-marker {
                        background: none;
                        border: none;
                    }
                    .marker-container {
                        min-width: 50px;
                        height: 28px;
                        color: white;
                        border-radius: 20px;
                        text-align: center;
                        line-height: 28px;
                        font-weight: 500;
                        position: relative;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        padding: 0 10px;
                        background-color: #1ABFB0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .marker-usd {
                        background-color: ${mapiaColors.usd};
                    }
                    .marker-ars {
                        background-color: ${mapiaColors.ars};
                    }
                    .price-tag {
                        white-space: nowrap;
                        font-size: 13px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }

                    /* Property popup styles */
                    .property-popup {
                        width: 300px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    }
                    .property-image {
                        position: relative;
                        height: 200px;
                        background-size: cover;
                        background-position: center;
                    }
                    .image-counter {
                        position: absolute;
                        right: 10px;
                        bottom: 10px;
                        background: rgba(0,0,0,0.5);
                        color: white;
                        padding: 2px 8px;
                        border-radius: 10px;
                        font-size: 12px;
                    }
                    .property-content {
                        padding: 15px;
                    }
                    .property-price {
                        font-size: 20px;
                        font-weight: bold;
                        margin-bottom: 4px;
                    }
                    .property-extras {
                        color: #666;
                        font-size: 12px;
                        margin-bottom: 8px;
                    }
                    .property-address {
                        font-size: 14px;
                        margin-bottom: 15px;
                    }
                    .property-features {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 15px;
                        font-size: 14px;
                    }
                    .property-actions {
                        display: flex;
                        justify-content: space-between;
                        border-top: 1px solid #eee;
                        padding-top: 10px;
                    }
                    .action-button {
                        text-decoration: none;
                        color: #1a73e8;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        font-size: 14px;
                        padding: 5px;
                    }
                    .action-button.primary {
                        background-color: #1ABFB0;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 4px;
                    }

                    /* Counter styles */
                    .results-counter {
                        position: absolute;
                        top: 10px;
                        left: 10px;
                        background: white;
                        padding: 8px 12px;
                        border-radius: 4px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        z-index: 1000;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 14px;
                        font-weight: 500;
                    }

                    /* Loading indicator styles */
                    .loading-indicator {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(255, 255, 255, 0.7);
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                    }

                    /* Estilos para el área de dibujo */
                    .leaflet-draw-section {
                        position: relative;
                    }
                    .leaflet-draw-toolbar .leaflet-draw-draw-polygon {
                        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 18 22 18 6"></polygon><path d="M18 6 L12 1 L1 6"></path></svg>');
                        background-position: center;
                        background-repeat: no-repeat;
                    }

                    /* Personalizar colores del área dibujada */
                    .leaflet-draw-guide-dash {
                        background-color: ${mapiaColors.primary} !important;
                    }
                    .leaflet-draw-guide {
                        stroke: ${mapiaColors.primary} !important;
                    }
                    .leaflet-draw-tooltip {
                        background-color: ${mapiaColors.primary} !important;
                        border-color: ${mapiaColors.primary} !important;
                        color: white !important;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);

                map = L.map('map', {
                    zoomControl: false  // Disable default zoom control to reposition it
                }).setView([-32.8908, -68.8272], 12);  // Mendoza, Argentina como centro por defecto

                // Add zoom control to bottom right
                L.control.zoom({
                    position: 'bottomright'
                }).addTo(map);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap'
                }).addTo(map);

                // Inicializar la herramienta de dibujo
                drawnItems = new L.FeatureGroup();
                map.addLayer(drawnItems);

                drawControl = new L.Control.Draw({
                    position: 'topright',
                    draw: {
                        polyline: false,
                        rectangle: true,
                        circle: false,
                        circlemarker: false,
                        marker: false,
                        polygon: {
                            allowIntersection: false,
                            drawError: {
                                color: '#e1e100',
                                message: '<strong>Oh snap!<strong> you can\'t draw that!'
                            },
                            shapeOptions: {
                                color: mapiaColors.primary,
                                fillOpacity: 0.2
                            }
                        }
                    },
                    edit: {
                        featureGroup: drawnItems,
                        remove: true
                    }
                });

                map.addControl(drawControl);

                // Evento para cuando se dibuja una forma en el mapa
                map.on(L.Draw.Event.CREATED, function (event) {
                    const type = event.layerType;
                    const layer = event.layer;

                    // Añadir la capa dibujada al grupo de capas editables
                    drawnItems.addLayer(layer);

                    // Si hay un polígono dibujado, puedes obtener sus límites
                    if (type === 'polygon' || type === 'rectangle') {
                        const bounds = layer.getBounds();
                        console.log('Límites del área:', bounds);

                        // Filtrar propiedades si hay algún filtro activo
                        if (propertyService) {
                            filterPropertiesByBounds(bounds);
                        }
                    }
                });

                // Evento para cuando se edita una forma
                map.on(L.Draw.Event.EDITED, function (event) {
                    const layers = event.layers;
                    layers.eachLayer(function (layer) {
                        const bounds = layer.getBounds();
                        console.log('Área editada:', layer.toGeoJSON());

                        // Re-filtrar propiedades
                        if (propertyService) {
                            filterPropertiesByBounds(bounds);
                        }
                    });
                });

                // Evento para cuando se elimina una forma
                map.on(L.Draw.Event.DELETED, function (event) {
                    console.log('Áreas eliminadas');
                    // Resetear filtros si es necesario
                    if (propertyService) {
                        refreshProperties();
                    }
                });

                mapInitialized = true;
            } catch (error) {
                console.error('Error al inicializar el mapa:', error);
            }
        }
    }

    // Método para mostrar propiedades en el mapa
    async function displayProperties(properties) {
        if (!properties || !Array.isArray(properties)) {
            console.error('Se esperaba un array de propiedades');
            return;
        }

        // Limpiar marcadores anteriores si los hay
        if (map) {
            map.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });
        }

        // Actualizamos la variable results con el conteo
        results = properties.length;

        // Procesamos cada propiedad
        properties.forEach(property => {
            // Verificar que tengamos coordenadas
            if (!property.latitude || !property.longitude) {
                console.warn('Propiedad sin coordenadas:', property);
                return;
            }

            // Get currency info
            const { currency, symbol } = detectCurrencyAndFormat(property.price);

            // Format prices
            const fullPrice = property.price ? formatFullPrice(property.price) : "Consultar precio";

            // Determine property type for marker color
            const propertyType = getPropertyType(property);

            // Create custom price marker
            const customIcon = createPriceMarker(property.price, propertyType);

            // Preparar las imágenes adicionales
            const allImages = [property.image || 'https://via.placeholder.com/300x200?text=No+imagen'];

            // Agregar imágenes adicionales si existen
            if (property.additional_images && Array.isArray(property.additional_images) && property.additional_images.length > 0) {
                allImages.push(...property.additional_images);
            }

            const mainImage = allImages[0];
            const imageCount = allImages.length;

            // Create custom popup component
            const customComponent = new DOMParser().parseFromString(`
                <div class="p-0 overflow-hidden">
                    <div>
                        <div class="relative">
                            <img src="${mainImage}" alt="Propiedad" class="w-full h-48 object-cover">
                            ${imageCount > 1 ? `
                                <div class="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-md text-xs">
                                    <span>1/${imageCount}</span>
                                </div>
                                <div class="absolute inset-y-0 left-0 flex items-center">
                                    <button class="prev-image bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-r p-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                </div>
                                <div class="absolute inset-y-0 right-0 flex items-center">
                                    <button class="next-image bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-l p-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            ` : ''}
                        </div>

                        <div class="p-4 pb-2">
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                $ ${property.price ? property.price.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.') : 'Consultar'}/mes
                            </h2>

                            <p class="text-gray-700 dark:text-gray-400 mb-3">
                                ${property.direccion || 'Dirección no disponible'}
                                <br>
                                ${propertyType === 'house' ? 'Casa' : 'Departamento'} · ${currency === 'usd' ? 'Precio en dólares' : 'Precio en pesos'}
                            </p>

                            <div class="flex flex-wrap gap-2 mb-4">
                                ${property.habitaciones ? `<span class="px-3 py-1 bg-gray-100 rounded-lg">${property.habitaciones} hab.</span>` : ''}
                                ${property.banos ? `<span class="px-3 py-1 bg-gray-100 rounded-lg">${property.banos} baños</span>` : ''}
                                ${property.supTotal ? `<span class="px-3 py-1 bg-gray-100 rounded-lg">${property.supTotal} m²</span>` : ''}
                            </div>

                            <a href="${property.url}" target="_blank"
                               class="inline-flex items-center px-4 py-2 mb-3 text-sm font-medium text-white bg-cyan-500 rounded-lg hover:bg-cyan-600 transition-colors">
                                Ver detalles
                                <svg class="w-4 h-4 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            `, 'text/html').body.firstChild;

            // Add marker with custom icon and popup
            L.marker([parseFloat(property.latitude), parseFloat(property.longitude)], {
                icon: customIcon
            })
            .addTo(map)
            .bindPopup(customComponent, {
                className: 'flowbite-popup',
                maxWidth: 320,
                minWidth: 300,
                closeButton: true,
                autoClose: false
            });
        });
    }

    // Función para cargar datos de propiedades usando el sistema de servicios
    async function loadProperties(dataSource, provinceSelected, citiesSelected, propertyTypeSelected) {
        if (!mapInitialized) {
            await initializeMap();
        } else {
            // Reset the map layers when performing a new search on an already initialized map
            // This prevents the "Map container is already initialized" error
            if (map) {
                map.eachLayer((layer) => {
                    if (layer instanceof L.Marker) {
                        map.removeLayer(layer);
                    }
                });
            }
        }

        loading = true;
        error = false;
        errormessage = '';

        try {
            // Obtener el servicio apropiado según la fuente de datos
            propertyService = await BasePropertyService.getService(dataSource);

            // Preparar los filtros según la fuente
            const filters = {
                province: provinceSelected || "",
                cities: citiesSelected || [],
                propertyType: propertyTypeSelected || "Departamentos"
            };

            // Obtener las propiedades
            const properties = await propertyService.searchProperties(filters);

            // Mostrar las propiedades en el mapa
            await displayProperties(properties);

            // Guardar las propiedades originales completas para filtrado local
            propertyService.allProperties = properties;

            // Finalizamos el loading cuando los datos están cargados
            loading = false;
        } catch (err) {
            console.error('Error fetching API data:', err);
            loading = false; // También desactivar el loading en caso de error
            error = true; // Ahora establece correctamente la variable de estado
            errormessage = `Error al cargar los datos. Por favor, inténtelo de nuevo más tarde. ${err.message}`;
        }
    }

    // Función para refrescar propiedades (volver a mostrar todas)
    function refreshProperties() {
        if (propertyService && propertyService.allProperties) {
            displayProperties(propertyService.allProperties);
        }
    }

    // Función para filtrar propiedades dentro de un área dibujada
    function filterPropertiesByBounds(bounds) {
        if (!propertyService || !propertyService.allProperties) {
            console.warn('No hay propiedades para filtrar');
            return;
        }

        // Filtrar propiedades dentro del área
        const filteredProperties = propertyService.allProperties.filter(property => {
            if (!property.latitude || !property.longitude) {
                return false;
            }

            const lat = parseFloat(property.latitude);
            const lng = parseFloat(property.longitude);

            // Verificar si la propiedad está dentro de los límites
            return bounds.contains(L.latLng(lat, lng));
        });

        // Mostrar las propiedades filtradas
        displayProperties(filteredProperties);

        // Actualizar contador
        results = filteredProperties.length;
    }

    // Reemplazamos la función handleFindBuildings para que inicie la búsqueda
    export function handleFindBuildings(dataSourceSelected, provinceSelected, citiesSelected, propertyTypeSelected) {
        searchInitiated = true;
        console.log(`Obteniendo edificios... Fuente: ${dataSourceSelected}, Provincia: ${provinceSelected}, Ciudades: ${citiesSelected}, Tipo de propiedad: ${propertyTypeSelected}`);

        // Limpiar áreas dibujadas anteriormente
        if (drawnItems) {
            drawnItems.clearLayers();
        }

        // Cargar propiedades según la fuente seleccionada
        if (dataSourceSelected) {
            loadProperties(dataSourceSelected, provinceSelected, citiesSelected, propertyTypeSelected);
        } else {
            error = true;
            errormessage = "Por favor, selecciona una fuente de datos";
        }
    }

    onMount(() => {
        // Ya no iniciamos la carga automáticamente
        // Dejamos que se inicie con el botón de búsqueda
    });
</script>

<style>
  #map {
    height: 100%;
    width: 100%;
    position: relative;
    z-index: 1;
  }

  /* Asegurarse de que el contenedor principal del componente tiene altura definida */
  :global(.app-container main), :global(.app-container main > div) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* Arreglar estilos de Leaflet */
  :global(.leaflet-container) {
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  :global(.leaflet-touch-drag) {
    -ms-touch-action: none !important;
    touch-action: none !important;
  }

  :global(.leaflet-touch-zoom) {
    -ms-touch-action: pan-x pan-y !important;
    touch-action: pan-x pan-y !important;
  }

  .results-counter {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
  }

  .loading-indicator {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .error-alert {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    text-align: center;
    max-width: 90%;
    width: 450px;
    z-index: 1000;
  }

  /* Estilo para el mensaje inicial */
  .welcome-message {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>

<div class="h-full w-full relative">
  {#if error}
    <div class="error-alert">
      <Alert color="red">
          <InfoCircleSolid slot="icon" class="w-5 h-5" />
          {errormessage || 'No se pudieron cargar las propiedades. Por favor, inténtalo de nuevo más tarde.'}
      </Alert>
    </div>
  {:else}
    {#if !searchInitiated}
      <div class="welcome-message">
        <Alert color="blue" class="max-w-md">
          <InfoCircleSolid slot="icon" class="w-5 h-5" />
          <span class="font-medium">Utiliza los filtros</span>
          <p>Selecciona los criterios de búsqueda y presiona "Buscar" para encontrar propiedades</p>
          <p class="mt-2">También puedes dibujar un área en el mapa para buscar propiedades en esa zona</p>
        </Alert>
      </div>
    {:else}
      <div id="map">
        {#if results > 0}
          <div class="results-counter">
            <Alert color="info" class="p-2 m-0">
              <span class="font-medium">{results} propiedades encontradas</span>
            </Alert>
          </div>
        {/if}

        {#if loading}
          <div class="loading-indicator">
            <Alert color="info">
              <Spinner slot="icon" size={5} />
              <span>Cargando propiedades...</span>
            </Alert>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
