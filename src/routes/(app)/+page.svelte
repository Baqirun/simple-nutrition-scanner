<script lang="ts">
  import { productStore } from '$lib/ui/product.svelte';
  import { goto } from '$app/navigation';
  import FoodCard from '$components/product/FoodCardList.svelte';
  import { resolve } from '$app/paths';
  import { settings } from '$lib/core/settings.svelte';
  import * as m from '$lib/paraglide/messages';

  let barcodeInput = $state("");

  const landingTitle = $derived(settings.landingTitle.trim() || m.home_default_title());
  const landingSubtitle = $derived(settings.landingSubtitle.trim() || m.home_default_subtitle());

  const stats = $derived({
    total: productStore.items.length,
    healthy: productStore.items.filter(i =>
      ['a', 'b'].includes(i.product.nutriscore_grade || 'unknown')
    ).length,
    recent: productStore.items.slice(0, 3)
  });

  function submit() {
    productStore.lookup(barcodeInput);
  }
</script>


<svelte:head>
    <title>{landingTitle} | {m.app_title_suffix()}</title>
    <meta name="description" content={m.app_meta_description()} />
</svelte:head>

<header class="bg-linear-65 from-purple-500 to-blue-700 text-primary-content px-5 pt-8 pb-12 rounded-b-[3rem] shadow-lg">
  <h1 class="text-3xl font-black mb-2">{landingTitle}</h1>
  <p class="opacity-90 text-sm mb-6 font-medium">{landingSubtitle}</p>

  <div class="join w-full shadow-2xl overflow-hidden">
    <input
      bind:value={barcodeInput}
      placeholder={m.home_barcode_placeholder()}
      class="input input-bordered join-item w-full text-base-content focus:outline-none"
      onkeydown={(e) => e.key === 'Enter' && productStore.lookup(barcodeInput)}
    />
    <button
      onclick={() => productStore.lookup(barcodeInput)}
      class="btn btn-secondary join-item px-6"
      disabled={productStore.loading}
    >
      {#if productStore.loading}
        <span class="loading loading-spinner loading-xs"></span>
      {:else}
        {m.home_check_button()}
      {/if}
    </button>
  </div>
</header>

<main class="p-5 -mt-8 pb-24 space-y-6">
  <div class="grid grid-cols-2 gap-4">
    <div class="stat bg-base-200 shadow-sm rounded-md border border-base-200 p-4">
      <div class="stat-title text-xs uppercase font-bold">{m.home_stat_total_scans()}</div>
      <div class="stat-value text-2xl">{stats.total}</div>
    </div>
    <div class="stat bg-base-200 shadow-sm rounded-md border border-base-200 p-4">
      <div class="stat-title text-xs uppercase font-bold">{m.home_stat_grade_ab()}</div>
      <div class="stat-value text-2xl text-success font-bold">{stats.healthy}</div>
    </div>
  </div>

  <section>
    <div class="flex justify-between items-end mb-4 px-1">
      <h2 class="text-lg font-bold">{m.home_latest_discoveries()}</h2>
      <button onclick={() => goto(resolve('/history'))} class="text-sm text-primary font-bold hover:underline cursor-pointer">
      <h3>{m.home_view_all()}</h3></button>
    </div>

    <FoodCard items={stats.recent}/>
  </section>
</main>
