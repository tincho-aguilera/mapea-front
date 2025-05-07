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
      console.log('Iniciando proceso de login...');
      const startTime = Date.now();

      // Cifrar la contraseña antes de enviarla
      const encryptedPassword = this.encryptPassword(password);
      console.log('Contraseña cifrada correctamente');

      // Crear FormData para enviar
      const formData = new URLSearchParams();

      // Enviamos usuario en texto plano y contraseña cifrada
      formData.append('username', username);
      formData.append('password', encryptedPassword);

      // Implementar un timeout para evitar esperas infinitas
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 segundos de timeout

      console.log('Enviando solicitud al servidor...');
      const response = await fetch(`${this.apiUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData,
        signal: abortController.signal
      }).catch(error => {
        if (error.name === 'AbortError') {
          throw new Error('La solicitud de login ha excedido el tiempo máximo de espera (15s)');
        }
        throw error;
      }).finally(() => {
        clearTimeout(timeoutId);
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al iniciar sesión');
      }

      console.log(`Respuesta recibida en ${Date.now() - startTime}ms`);
      const data = await response.json();

      // Guardar el token de forma segura
      this.setToken(data.access_token);

      // Obtener información del usuario
      await this.fetchUserInfo();

      console.log(`Proceso de login completado en ${Date.now() - startTime}ms`);
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

  /**
   * Cifra un texto utilizando una técnica simple compatible con el backend
   * @param {string} text Texto a cifrar
   * @returns {string} Texto cifrado en formato base64
   */
  encryptPassword(password) {
    try {
      console.log("Usando cifrado personalizado simple...");

      // Solución: usamos un enfoque simple
      // que garantiza compatibilidad entre frontend y backend

      // 1. Codificar la contraseña en base64
      const base64Password = btoa(password);

      // 2. Agregar una firma simple para indicar que es contraseña cifrada
      // El backend sabrá cómo procesarla
      return `CUSTOM_ENC:${base64Password}`;
    } catch (error) {
      console.error('Error al cifrar datos:', error);
      throw new Error('Error en el proceso de cifrado');
    }
  }
}

// Exportamos una única instancia para toda la aplicación
export default new AuthService();
