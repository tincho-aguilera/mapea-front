<!-- src/routes/login/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AuthService from '$lib/services/AuthService';

  let username = ''; // Eliminadas credenciales predeterminadas
  let password = ''; // Eliminadas credenciales predeterminadas
  let error = '';
  let loading = false;
  let autoLoginAttempted = false;

  onMount(async () => {
    // Si ya está autenticado, redirigir a la página principal
    if (AuthService.isAuthenticated()) {
      goto('/');
      return;
    }

    // Nota: Se ha eliminado el login automático por motivos de seguridad
    autoLoginAttempted = true; // Para evitar mensaje de carga
  });

  async function handleLogin() {
    error = '';
    loading = true;

    try {
      if (!username || !password) {
        throw new Error('Por favor ingrese usuario y contraseña');
      }

      await AuthService.login(username, password);

      // Redirigir a la página principal tras login exitoso
      goto('/');
    } catch (e) {
      error = e.message || 'Error al iniciar sesión';
      console.error('Error de login:', e);
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-container">
  <div class="login-form">
    <h1>Mapea</h1>
    <h2>Iniciar sesión</h2>

    {#if error}
      <div class="error-message">
        {error}
      </div>
    {/if}

    <form on:submit|preventDefault={handleLogin}>
      <div class="form-group">
        <label for="username">Usuario</label>
        <input
          type="text"
          id="username"
          bind:value={username}
          placeholder="Usuario"
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="password">Contraseña</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          placeholder="Contraseña"
          disabled={loading}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f5f5f5;
  }

  .login-form {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
  }

  h1 {
    margin: 0 0 0.5rem;
    color: #333;
    font-size: 1.8rem;
    text-align: center;
  }

  h2 {
    margin: 0 0 1.5rem;
    color: #666;
    font-size: 1.2rem;
    text-align: center;
  }

  .error-message {
    background-color: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  input:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2);
  }

  button {
    width: 100%;
    padding: 0.75rem;
    background-color: #4299e1;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  button:hover:not(:disabled) {
    background-color: #3182ce;
  }

  button:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }
</style>
