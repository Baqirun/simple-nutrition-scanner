<script lang="ts">
    import type {Product } from '$lib/types/product'
    import { productStore } from '$lib/ui/product.svelte';
    import { resolve } from "$app/paths";
    import { ProductAnalysis } from '$lib/models/productAnalysis';
    import { ratingClasses } from '$lib/utils/helpers/ratingClasses';
    import {
      localizedProductBrands,
      localizedProductName,
      localizedRatingLabel
    } from '$lib/utils/helpers/localizedProduct';
    import * as m from '$lib/paraglide/messages';

    type Props = {
      items: Product[];
      toggleDelete?: boolean;
      messageEmpty?: string;
    }

    let {
      items,
      toggleDelete = false,
      messageEmpty = m.common_empty_list()
    }: Props  = $props();

    function removeItem(e: Event, item: Product) {
        e.preventDefault();
        e.stopPropagation();
        productStore.remove(item.code);
    }
</script>

{#if items.length === 0}
  <div class="flex flex-col items-center justify-center p-12 bg-base-200 rounded-3xl shadow-sm border border-base-200">
    <div class="text-4xl mb-4 opacity-60">🔍</div>
    <p class="text-sm font-medium text-base-content/60">{messageEmpty}</p>
  </div>
{:else}
  <div class="flex flex-col gap-4">
    {#each items as item (item.code)}
    {@const info = new ProductAnalysis(item)}
    {@const tone = ratingClasses(info.rating)}
      <a
        href={resolve(`/history/${item.code}`)}
        class="group relative flex items-center bg-base-200/50 rounded-xl p-4 shadow-sm border border-base-300 active:scale-[0.98] transition-all hover:border-primary/25 hover:shadow-md"
      >
        <div class="relative h-16 w-16 min-w-16 overflow-hidden rounded-xl bg-base-content/10 flex items-center justify-center shadow-inner">
          {#if info.imageUrl}
            <img src={info.imageUrl} alt={info.name} class="h-full w-full object-cover" crossorigin="anonymous"/>
          {:else}
            <span class="text-2xl">🛒</span>
          {/if}
        </div>

        <div class="flex-1 px-4 overflow-hidden text-left">
          <h3 class="font-bold text-sm text-base-content line-clamp-1 leading-snug">
            {localizedProductName(info)}
          </h3>
          <p class="text-xs font-medium opacity-50 truncate">
            {localizedProductBrands(info)}
          </p>
          <div class="flex items-center gap-1 mt-1">
             {#if info.isRated}
               <div class="w-2 h-2 rounded-full {tone.dot}"></div>
               <span class="text-[10px] font-bold uppercase opacity-60 tracking-wider">{m.card_score_label({ label: localizedRatingLabel(info.rating) })}</span>
             {:else}
               <span class="text-[10px] font-bold uppercase opacity-45 tracking-wider">{m.card_not_rated()}</span>
             {/if}
          </div>
        </div>

        <div class="flex items-center gap-2">
          {#if info.isRated}
            <div class="radial-progress border-4 border-base-content/10 {tone.ring}" style="--value:{info.score}; --size:2.5rem; --thickness: 4px;" role="progressbar" aria-label={m.card_score_aria({ score: info.score, grade: info.rating.grade })}>
              <span class="text-[10px] font-black text-base-content">{info.rating.grade}</span>
            </div>
          {:else}
            <div class="radial-progress border-4 border-base-content/10 opacity-45" style="--size:2.5rem; --thickness: 0;" role="img" aria-label={m.card_not_rated()}>
              <span class="text-[10px] font-black text-base-content/60">—</span>
            </div>
          {/if}

          {#if toggleDelete}
            <button
              type="button"
              onclick={(e) => removeItem(e,item)}
              class="btn btn-circle btn-ghost btn-xs text-error/40 hover:text-error hover:bg-error/10"
              aria-label={m.card_delete_aria()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      </a>
    {/each}
  </div>
{/if}
