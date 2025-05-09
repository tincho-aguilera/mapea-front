<script>
    import { onMount } from 'svelte';
    import { gsap } from 'gsap';

    let mapEl;

    onMount(async () => {
      const { Lenis } = await import('@studio-freight/lenis');

      const lenis = new Lenis();
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);

      // Observador para animar el mapa cuando entra en viewport
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            gsap.to(mapEl, {
              scale: 1,
              opacity: 1,
              duration: 1,
              ease: 'power2.out'
            });
            observer.disconnect();
          }
        },
        { threshold: 0.5 }
      );

      observer.observe(mapEl);
    });
  </script>

  <style>
    .spacer {
      height: 100vh;
      background: #eee;
    }

    .map {
      width: 90%;
      height: 400px;
      margin: 0 auto;
      background: lightblue;
      border: 2px solid #444;
      transform: scale(0.8);
      opacity: 0;
      transition: transform 0.3s;
    }
  </style>

  <div class="spacer">Scroll hacia abajo</div>

  <div bind:this={mapEl} class="map">
    <!-- Acá iría tu mapa real (Leaflet, Mapbox, etc.) -->
    <h2 style="text-align:center; padding-top: 180px;">Mapa</h2>
  </div>

  <div class="spacer">Fin de la página</div>
