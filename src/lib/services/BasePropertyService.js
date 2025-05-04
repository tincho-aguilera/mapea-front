/**
 * Clase base abstracta para todos los scrapers de propiedades
 * Implementa el patrón de inversión de dependencia
 */
import AuthService from './AuthService';

export class BasePropertyService {
  constructor() {
    // Obtener la URL de la API desde variables de entorno
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  /**
   * Método para buscar propiedades según filtros
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Array>} - Lista de propiedades
   */
  async searchProperties(filters) {
    throw new Error('Método searchProperties debe ser implementado por las clases hijas');
  }

  /**
   * Obtiene los headers HTTP para las solicitudes a la API, incluyendo autenticación
   * @returns {Object} - Headers HTTP
   */
  getHeaders() {
    // Obtener los headers de autenticación (token JWT)
    const authHeaders = AuthService.getAuthHeaders();

    // Combinar con otros headers necesarios
    return {
      'Content-Type': 'application/json',
      ...authHeaders
    };
  }

  /**
   * Realiza una solicitud HTTP autenticada a la API
   * Maneja automáticamente la autenticación si no hay un token válido
   * @param {string} url - URL de la solicitud
   * @param {Object} options - Opciones de fetch
   * @returns {Promise<Response>} - Respuesta de la API
   */
  async authenticatedFetch(url, options = {}) {
    try {
      // Verificar si estamos autenticados
      if (!AuthService.isAuthenticated()) {
        // Intentar login silencioso si no estamos autenticados
        const loginSuccess = await AuthService.silentLogin();
        if (!loginSuccess) {
          throw new Error('No se pudo autenticar automáticamente');
        }
      }

      // Preparar las opciones con los headers de autenticación
      const authOptions = {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...(options.headers || {})
        }
      };

      // Realizar la solicitud
      const response = await fetch(url, authOptions);

      // Si recibimos un 401 (Unauthorized), el token puede haber expirado
      if (response.status === 401) {
        // Limpiar el token actual
        AuthService.clearToken();

        // Intentar login silencioso nuevamente
        const loginSuccess = await AuthService.silentLogin();

        if (loginSuccess) {
          // Si el login fue exitoso, reintentar la solicitud con el nuevo token
          authOptions.headers = {
            ...this.getHeaders(),
            ...(options.headers || {})
          };

          return fetch(url, authOptions);
        } else {
          throw new Error('Error de autenticación');
        }
      }

      return response;
    } catch (error) {
      console.error('Error en solicitud autenticada:', error);
      throw error;
    }
  }

  /**
   * Método para geocodificar una dirección
   * @param {string} address - Dirección a geocodificar
   * @returns {Promise<Object|null>} - Coordenadas {latitude, longitude} o null si falla
   */
  async geocodeAddress(address) {
    try {
      // Añadir ", Mendoza, Argentina" si no está especificado completamente
      if (!address.toLowerCase().includes('argentina')) {
        if (!address.toLowerCase().includes('mendoza')) {
          address += ', Mendoza, Argentina';
        } else {
          address += ', Argentina';
        }
      }

      // Escapar la dirección para la URL
      const encodedAddress = encodeURIComponent(address);

      // Hacer la petición a la API de Nominatim
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`);

      if (!response.ok) {
        throw new Error('Error al geocodificar la dirección');
      }

      const data = await response.json();

      // Verificar si encontramos resultados
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      } else {
        console.warn(`No se pudieron encontrar coordenadas para: ${address}`);
        return null;
      }
    } catch (error) {
      console.error('Error en geocodificación:', error);
      return null;
    }
  }

  /**
   * Factory method para obtener una instancia del servicio adecuado
   * @param {string} sourceName - Nombre de la fuente de datos
   * @returns {BasePropertyService} - Instancia del servicio correspondiente
   */
  static getService(sourceName) {
    const serviceMap = {
      'inmoup': () => import('./inmoup/InmoupService').then(m => new m.InmoupService()),
      'mendozaprop': () => import('./mendozaprop/MendozapropService').then(m => new m.MendozapropService()),
      // Añadir más servicios aquí cuando se implementen
    };

    const serviceFactory = serviceMap[sourceName.toLowerCase()];

    if (!serviceFactory) {
      throw new Error(`No se encontró un servicio para la fuente: ${sourceName}`);
    }

    return serviceFactory();
  }
}
