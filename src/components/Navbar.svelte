<script>
    import { createEventDispatcher } from 'svelte';
    import { Navbar, NavBrand, NavHamburger, Button, DarkMode } from 'flowbite-svelte';

    const dispatch = createEventDispatcher();

    function handleOpenFilters() {
        dispatch('openFilters');
    }
</script>

<Navbar>
  <NavBrand href="/">
    <img src="/images/favicon-64x64.png?v=2" class="me-3 h-8 sm:h-12 rounded-full" alt="Mapea Logo" />
    <span class="self-center whitespace-nowrap text-2xl font-semibold dark:text-white">Mapea</span>
  </NavBrand>
  <div class="flex md:order-2 items-center gap-4">
    <DarkMode class="mr-2" />
    <Button size="sm" on:click={handleOpenFilters}>Aplicar filtros</Button>
    <NavHamburger />
  </div>
</Navbar>
