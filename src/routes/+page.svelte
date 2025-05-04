<script>
    import 'leaflet/dist/leaflet.css';
    // Correct the import path to point to mendozaprop static data
    import {CITIES, PROVINCES} from '$lib/services/mendozaprop/staticData';
    import {DATA_SOURCES} from '$lib/staticSources';
    // Importamos los tipos de propiedad de cada fuente
    import {PROPERTY_TYPES as INMOUP_PROPERTY_TYPES} from '$lib/services/inmoup/staticData';
    import {PROPERTY_TYPES_ARRAYS as MENDOZAPROP_PROPERTY_TYPES} from '$lib/services/mendozaprop/staticData';
    import { browser } from '$app/environment';
    import AuthService from '$lib/services/AuthService';

    import PropertyMap from '../components/PropertyMap.svelte'; // Cambiado de Map a PropertyMap
    // Eliminar importación del Navbar ya que se carga desde el layout

    import { Label, Select, MultiSelect, Button, Drawer, CloseButton, Spinner } from 'flowbite-svelte';
    import { InfoCircleSolid } from 'flowbite-svelte-icons';
    import { sineIn } from 'svelte/easing';
    import { onMount, onDestroy } from 'svelte';

    // URL del backend desde variables de entorno
    const BACKEND_URL = import.meta.env.VITE_API_URL;

    let transitionParams = {
        x: -320,
        duration: 200,
        easing: sineIn
    };

    let mapComponent;

    let hiddenFilters = true;
    let propertyTypeSelected = "Departamentos";
    // Inicialmente no hay fuente seleccionada
    let dataSourceSelected = "";
    let provinceSelected;
    let citiesSelected = [];

    // Dynamic states for provinces and cities
    let dynamicProvinces = [];
    let dynamicCities = [];
    let loadingProvinces = false;
    let loadingCities = false;
    let error = '';

    // Estado para almacenar la respuesta original de la API
    let inmoupLocations = [];

    // Estado para tipos de propiedad dinámicos
    let dynamicPropertyTypes = [];
    let loadingPropertyTypes = false;

    // Flag para controlar cuándo actualizar las provincias y ciudades
    let mounted = false;

    // Función para escuchar eventos de ventana
    function handleToggleFilters() {
        hiddenFilters = !hiddenFilters;
    }

    // When the component mounts, no fetching since there's no source selected
    onMount(() => {
        mounted = true;

        // Escuchar el evento toggleFilters desde el componente de layout
        if (browser) {
            window.addEventListener('toggleFilters', handleToggleFilters);
        }
    });

    onDestroy(() => {
        // Limpiar los event listeners al desmontar el componente
        if (browser) {
            window.removeEventListener('toggleFilters', handleToggleFilters);
        }
    });

    // Watch for changes in data source selection, pero solo después del montaje
    $: if (mounted && browser && dataSourceSelected === "Inmoup") {
        fetchInmoupLocations();
        // Cargar tipos de propiedad para Inmoup
        dynamicPropertyTypes = INMOUP_PROPERTY_TYPES;
        propertyTypeSelected = undefined;
    } else if (mounted && dataSourceSelected === "mendozaprop") { // Corregido a minúscula para coincidir con staticSources.js
        // Cargar tipos de propiedad para MendozaProp
        dynamicPropertyTypes = MENDOZAPROP_PROPERTY_TYPES;
        propertyTypeSelected = undefined;
        // Reset to static data
        dynamicProvinces = [...PROVINCES];
        dynamicCities = [...CITIES];
        provinceSelected = undefined;
        citiesSelected = [];
    } else if (mounted && dataSourceSelected) {
        // Reset to static data if another source is selected
        if (dataSourceSelected === "Zonaprop" || dataSourceSelected === "MercadoLibre") {
            dynamicProvinces = [...PROVINCES];
            dynamicCities = [...CITIES];
            // Podríamos tener tipos de propiedad por defecto para estas fuentes
            dynamicPropertyTypes = [];
        } else {
            dynamicProvinces = [];
            dynamicCities = [];
            dynamicPropertyTypes = [];
        }
        propertyTypeSelected = undefined;
        provinceSelected = undefined;
        citiesSelected = [];
    }

    // Watch for changes in province selection to update cities, pero solo después del montaje
    $: if (mounted && browser && provinceSelected && dataSourceSelected === "Inmoup") {
        updateInmoupCities(provinceSelected);
    }

    // Function to fetch locations from Inmoup usando nuestro proxy backend
    async function fetchInmoupLocations() {
        // Asegurarnos de que estamos en el cliente
        if (!browser) return;

        loadingProvinces = true;
        error = '';
        try {
            // Usamos el endpoint proxy del backend en lugar de llamar directamente a Inmoup
            // Incluimos el token de autenticación en los headers
            const response = await fetch(`${BACKEND_URL}/api/inmoup/zonas`, {
                headers: AuthService.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const data = await response.json();

            // Guardar la respuesta completa
            inmoupLocations = data;

            // Extraer provincias únicas - con comprobación adicional
            if (Array.isArray(data)) {
                const provincesMap = new Map();

                data.forEach(location => {
                    if (location && location.pro_id && location.pro_desc) {
                        if (!provincesMap.has(location.pro_id)) {
                            provincesMap.set(location.pro_id, {
                                value: location.pro_id.toString(),
                                name: location.pro_desc // Cambiado de 'label' a 'name' para consistencia
                            });
                        }
                    }
                });

                // Convertir el mapa a array de provincias
                const provinces = Array.from(provincesMap.values());

                if (provinces.length > 0) {
                    dynamicProvinces = provinces;
                    console.log("Provincias Inmoup cargadas:", dynamicProvinces);
                }
            } else {
                throw new Error('La respuesta no es un array válido');
            }
        } catch (err) {
            console.error('Error al obtener ubicaciones de Inmoup:', err);
            error = 'No se pudieron cargar las provincias desde Inmoup. Por favor, selecciona otra fuente en el filtro.';
        } finally {
            loadingProvinces = false;
        }
    }

    // Function to filter cities by province ID
    function updateInmoupCities(provinceId) {
        if (!provinceId) return;

        loadingCities = true;
        citiesSelected = []; // Reset selected cities
        error = '';

        try {
            // Verificar que inmoupLocations sea un array
            if (!Array.isArray(inmoupLocations)) {
                throw new Error('No hay datos de ubicaciones disponibles');
            }

            // Filtrar ciudades por ID de provincia
            const cities = inmoupLocations
                .filter(location => location &&
                       location.pro_id &&
                       location.pro_id.toString() === provinceId.toString())
                .map(location => ({
                    value: location.id.toString(),
                    name: location.text // Cambiado de 'label' a 'name' para consistencia
                }));

            if (cities.length > 0) {
                dynamicCities = cities;
            } else {
                dynamicCities = [];
                error = 'No se encontraron ciudades para esta provincia';
            }
        } catch (err) {
            console.error('Error al procesar ciudades de Inmoup:', err);
            error = 'Error al procesar las ciudades';
        } finally {
            loadingCities = false;
        }
    }

    // Toggle para mostrar/ocultar panel en mobile
    function handleOpenFilters() {
        hiddenFilters = !hiddenFilters;
    }
    function handleFindBuildings(){
        if (!dataSourceSelected) {
            error = 'Por favor, selecciona una fuente antes de buscar.';
            return;
        }

        mapComponent.handleFindBuildings(
            dataSourceSelected,
            provinceSelected,
            citiesSelected,
            propertyTypeSelected
        );
    }
</script>

<div class="app-container">
    <main class="mx-auto flex flex-wrap justify-between items-center container">
        <PropertyMap bind:this={mapComponent} />
    </main>
    <Drawer
        transitionType="fly"
        {transitionParams}
        bind:hidden={hiddenFilters}
        id="sidebar1"
        divClass="z-999 bg-white p-4"
        placement="left"
        width="w-80"
    >
        <div class="flex items-center">
        <h5 id="drawer-label" class="inline-flex items-center mb-4 text-base font-semibold text-gray-500 dark:text-gray-400">
            <InfoCircleSolid class="w-5 h-5 me-2.5" />Info
        </h5>
        <CloseButton on:click={handleOpenFilters} class="mb-4 dark:text-white" />
        </div>
        <div class="filter-panel">
                <div class="filter-section">
                    <Label>
                        Fuente
                        <Select class="mt-2" items={DATA_SOURCES} bind:value={dataSourceSelected} placeholder="Seleccionar fuente..." />
                    </Label>
                </div>
                <div class="filter-section">
                    <Label>
                        Provincia
                        {#if loadingProvinces}
                            <div class="mt-2 flex items-center justify-center py-2">
                                <Spinner size="4" />
                                <span class="ml-2">Cargando provincias...</span>
                            </div>
                        {:else if !dataSourceSelected}
                            <div class="mt-2 text-sm text-gray-500 py-2">
                                Selecciona primero una fuente
                            </div>
                        {:else}
                            <Select class="mt-2" items={dynamicProvinces} bind:value={provinceSelected} placeholder="Seleccionar provincia..." name="name" />
                        {/if}
                    </Label>
                </div>
                <div class="filter-section">
                    <Label>
                        Ciudades
                        {#if loadingCities}
                            <div class="mt-2 flex items-center justify-center py-2">
                                <Spinner size="4" />
                                <span class="ml-2">Cargando ciudades...</span>
                            </div>
                        {:else if !dataSourceSelected}
                            <div class="mt-2 text-sm text-gray-500 py-2">
                                Selecciona primero una fuente
                            </div>
                        {:else if !provinceSelected}
                            <div class="mt-2 text-sm text-gray-500 py-2">
                                Selecciona primero una provincia
                            </div>
                        {:else}
                            <MultiSelect items={dynamicCities} bind:value={citiesSelected} placeholder="Seleccionar ciudades..." name="name" />
                        {/if}
                    </Label>
                </div>
                <div class="filter-section">
                    <Label>
                        Tipo de propiedad
                        <Select class="mt-2" items={dynamicPropertyTypes} bind:value={propertyTypeSelected} placeholder="Seleccionar tipo..." name="name" />
                    </Label>
                </div>
                {#if error}
                    <div class="text-red-500 text-sm mb-4">{error}</div>
                {/if}
            </div>
        <div class="grid grid-cols-1 gap-4 mt-4">
        <Button class='w-full' color="primary" on:click={handleFindBuildings}>Buscar...</Button>
        </div>
    </Drawer>
</div>

<style>
    .app-container {
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
    }
    .filter-section {
        margin-bottom: 1.5rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid #eee;
    }
</style>
