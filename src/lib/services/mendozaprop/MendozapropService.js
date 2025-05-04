import { BasePropertyService } from '../BasePropertyService';

/**
 * Servicio específico para la fuente de datos MendozaProp
 */
export class MendozapropService extends BasePropertyService {
  constructor() {
    super();
    // La URL base ahora viene de BasePropertyService que usa variables de entorno
    this.baseUrl = `${this.apiUrl}/api`;
  }

  /**
   * Busca propiedades de MendozaProp usando el endpoint unificado
   * @param {Object} filters - Criterios de búsqueda
   * @param {string} filters.province - Provincia (opcional)
   * @param {Array<string>} filters.cities - Lista de ciudades (opcional)
   * @param {string} filters.propertyType - Tipo de propiedad (opcional)
   * @returns {Promise<Array>} - Lista de propiedades
   */
  async searchProperties(filters = {}) {
    try {
      const { province = "", cities = [], propertyType = "Departamentos" } = filters;

      // Crear el objeto de la solicitud
      const requestBody = {
        source: "mendozaprop",
        province: province,
        cities: cities,
        property_type: propertyType
      };

      // Usar el método authenticatedFetch que manejará automáticamente la autenticación
      const response = await this.authenticatedFetch(`${this.baseUrl}/properties/search`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Verificar que la respuesta sea un array
      if (!Array.isArray(data)) {
        throw new Error('La respuesta de la API no tiene el formato esperado');
      }

      // Filtrar propiedades sin coordenadas
      return data.filter(p => p.latitude && p.longitude);
    } catch (error) {
      console.error('Error en la búsqueda de MendozaProp:', error);
      throw error;
    }
  }
}
