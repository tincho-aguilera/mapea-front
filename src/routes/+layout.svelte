<script>
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import AuthService from '$lib/services/AuthService';
	import Navbar from '../components/Navbar.svelte';

	let { children } = $props();
	// Usar $state para declarar variables reactivas
	let isAuthenticated = $state(false);
	let isCheckingAuth = $state(true);

	// Lista de rutas públicas (no requieren autenticación)
	const publicRoutes = ['/login'];

	// Verificar estado de autenticación
	// onMount(async () => {
	// 	await checkAuth();
	// });

	// Función para verificar autenticación
	async function checkAuth() {
		isCheckingAuth = true;

		// Primero comprobar si ya estamos autenticados
		if (!AuthService.isAuthenticated()) {
			// Si no estamos autenticados, intentar login silencioso
			await AuthService.silentLogin();
		}

		// Actualizar estado de autenticación después de intento de login
		isAuthenticated = AuthService.isAuthenticated();

		// Si no está autenticado y la ruta actual no es pública, mostrar error o pantalla de carga
		// Nota: En este caso, no redirigimos al login ya que es un proceso interno
		if (!isAuthenticated && !publicRoutes.includes($page.route.id)) {
			console.error("Error de autenticación automática con el backend");
			// Opcionalmente, se podría mostrar un mensaje de error al usuario
		}

		isCheckingAuth = false;
	}

	// Manejar el evento openFilters del Navbar y propagarlo a la ventana
	function handleOpenFilters() {
		// Crear y disparar un evento personalizado a nivel de ventana
		const event = new CustomEvent('toggleFilters');
		window.dispatchEvent(event);
	}
</script>

<!-- {#if isCheckingAuth} -->
	<!-- Loader mientras se verifica autenticación -->
	<!-- <div class="auth-checking">
		<p>Cargando aplicación...</p>
	</div> -->
<!-- {:else} -->
	<!-- {#if isAuthenticated} -->
		<Navbar on:openFilters={handleOpenFilters} />
		<main>
			{@render children()}
		</main>
	<!-- {:else} -->
		<!-- Mostrar mensaje de error o pantalla de carga si la autenticación falló -->
		<!-- <div class="auth-error">
			<h2>Error de conexión</h2>
			<p>No se pudo conectar con el servicio. Intente nuevamente más tarde.</p>
			<button on:click={checkAuth}>Reintentar</button>
		</div> -->
	<!-- {/if} -->
<!-- {/if} -->

<style>
	.auth-checking {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		font-size: 1.2rem;
		color: #666;
	}

	.auth-error {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100vh;
		padding: 2rem;
		text-align: center;
	}

	.auth-error h2 {
		color: #e53e3e;
		margin-bottom: 1rem;
	}

	.auth-error button {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background-color: #4299e1;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.auth-error button:hover {
		background-color: #3182ce;
	}

	main {
		width: 100%;
		height: 100%;
	}
</style>
