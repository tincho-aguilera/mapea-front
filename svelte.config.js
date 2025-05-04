import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Cambiamos el adaptador a Vercel para optimizar el despliegue
		adapter: adapter()
	}
};

export default config;
