/**
 * Servicio de autenticación para el frontend
 * Maneja inicio de sesión, almacenamiento de tokens y verificación de autenticación
 */
class AuthService {
  constructor() {
    this.tokenKey = 'alquileres_token';
    this.userKey = 'alquileres_user';
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // URL base del backend desde variables de entorno
    this.apiUsername = import.meta.env.VITE_API_USERNAME; // Usuario desde variables de entorno
    this.apiPassword = import.meta.env.VITE_API_PASSWORD; // Contraseña desde variables de entorno
    this.isAuthenticating = false; // Flag para evitar múltiples intentos simultáneos
  }

  /**
   * Realiza el inicio de sesión en el backend
   * @param {string} username Nombre de usuario
   * @param {string} password Contraseña
   * @returns {Promise<Object>} Respuesta del servidor con el token
   */
  async login(username, password) {
    try {
      // Crear FormData para enviar como x-www-form-urlencoded (requerido por OAuth2)
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${this.apiUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al iniciar sesión');
      }

      const data = await response.json();

      // Guardar el token de forma segura
      this.setToken(data.access_token);

      // Obtener información del usuario
      await this.fetchUserInfo();

      return data;
    } catch (error) {
      console.error('Error de autenticación:', error);
      throw error;
    }
  }

  /**
   * Realiza un login silencioso con credenciales desde variables de entorno.
   * No expone credenciales en el código fuente.
   * @returns {Promise<boolean>} true si el login fue exitoso
   */
  async silentLogin() {
    // Evitar múltiples intentos simultáneos
    if (this.isAuthenticating) {
      // Esperar a que termine el intento actual
      let waitCount = 0;
      while (this.isAuthenticating && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      return this.isAuthenticated();
    }

    if (this.isAuthenticated()) {
      return true;
    }

    this.isAuthenticating = true;
    try {
      // Verificar que tenemos las credenciales necesarias
      if (!this.apiUsername || !this.apiPassword) {
        console.error('Error: Credenciales de API no configuradas en variables de entorno');
        return false;
      }

      // Usar credenciales desde variables de entorno
      await this.login(this.apiUsername, this.apiPassword);
      return true;
    } catch (error) {
      console.error('Error en login silencioso:', error);
      return false;
    } finally {
      this.isAuthenticating = false;
    }
  }

  /**
   * Obtiene la información del usuario actual desde el backend
   * @returns {Promise<Object>} Datos del usuario
   */
  async fetchUserInfo() {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${this.apiUrl}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener información del usuario');
      }

      const userData = await response.json();
      // Almacenar datos del usuario (sin información sensible)
      this.setUserData(userData);

      return userData;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      this.clearToken(); // Solo eliminamos el token, sin redirección
      throw error;
    }
  }

  /**
   * Cierra la sesión del usuario eliminando el token
   */
  logout() {
    this.clearToken();
    this.clearUserData();
    window.location.href = '/login'; // Redirigir a la página de login
  }

  /**
   * Elimina el token JWT del almacenamiento
   */
  clearToken() {
    localStorage.removeItem(this.tokenKey);
    // Usar sessionStorage ofrece mayor seguridad que localStorage para tokens
    sessionStorage.removeItem(this.tokenKey);
  }

  /**
   * Elimina los datos del usuario del almacenamiento
   */
  clearUserData() {
    localStorage.removeItem(this.userKey);
  }

  /**
   * Guarda el token JWT de forma más segura
   * @param {string} token Token JWT
   */
  setToken(token) {
    // Usar sessionStorage en lugar de localStorage para tokens
    // sessionStorage se borra al cerrar la pestaña y es menos vulnerable a XSS
    sessionStorage.setItem(this.tokenKey, token);
  }

  /**
   * Almacena los datos del usuario (sin información sensible)
   * @param {Object} userData Datos del usuario
   */
  setUserData(userData) {
    // Asegurarse de no guardar información sensible
    const safeUserData = {
      username: userData.username,
      disabled: userData.disabled
    };
    localStorage.setItem(this.userKey, JSON.stringify(safeUserData));
  }

  /**
   * Obtiene el token JWT almacenado
   * @returns {string|null} Token JWT o null si no existe
   */
  getToken() {
    // Preferir sessionStorage para tokens
    return sessionStorage.getItem(this.tokenKey);
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean} true si el usuario está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Obtiene el usuario actual
   * @returns {Object|null} Datos del usuario o null si no está autenticado
   */
  getCurrentUser() {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Obtiene las cabeceras de autenticación para las peticiones a la API
   * @returns {Object} Cabeceras HTTP con el token Bearer
   */
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

// Exportamos una única instancia para toda la aplicación
export default new AuthService();
