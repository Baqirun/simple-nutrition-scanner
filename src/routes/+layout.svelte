<script lang="ts">
    import { locale } from "$lib/ui/locale.svelte";

    const { children } = $props();
</script>

{#key locale.current}
    {@render children()}
{/key}
