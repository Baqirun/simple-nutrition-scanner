<script lang="ts">
    import { labelIcons } from "$lib/utils/helpers/labels";
    import { ratingClasses } from "$lib/utils/helpers/ratingClasses";
    import {
        localizedProductBrands,
        localizedProductName,
        localizedRatingLabel
    } from "$lib/utils/helpers/localizedProduct";
    import * as m from "$lib/paraglide/messages";
    import type { ProductAnalysis } from "$lib/models/productAnalysis";

    let { analysis }: { analysis: ProductAnalysis } = $props();

    const tone = $derived(ratingClasses(analysis.rating));
    const displayName = $derived(localizedProductName(analysis));
    const displayBrands = $derived(localizedProductBrands(analysis));
</script>


<!-- product image section -->
<div class="bg-base-100 p-5 pb-12 rounded-b-[3rem] shadow-sm relative overflow-hidden">
    <div class="flex flex-col items-center max-w-md mx-auto">
        <div class="relative w-48 h-48 mb-6 group">
           {#if analysis.imageUrl}
            <img
                src={analysis.imageUrl}
                alt={displayName}
                class="w-full h-full object-contain rounded-2xl bg-base-content/10 shadow-lg transition-transform duration-300 group-hover:scale-105"
                crossorigin="anonymous"
            />
            {:else}
            <div class="w-full h-full rounded-2xl bg-base-300 flex items-center justify-center text-4xl">
                🛒
            </div>
            {/if}
        </div>

        <h1 class="text-2xl font-bold text-center px-4 leading-tight mb-1">{displayName}</h1>
        <p class="text-base-content/60 text-center mb-4">{displayBrands}</p>

        <!-- food labels -->
        {#if analysis.labels.length}
        <div class="flex flex-wrap justify-center gap-2 mb-6">
            {#each analysis.labels.slice(0, 5) as label}
                <div class="badge bg-base-300 text-xs font-bold py-3">
                    <span class="mr-1 ">{labelIcons[label] || '🏷️'}</span>
                    {label.replace('en:', '').replace(/-/g, ' ')}
                </div>
            {/each}
        </div>
        {/if}

        <!-- score circle -->
        {#if analysis.isRated}
            <div class="flex items-center gap-6">
                <div
                    class="radial-progress border-8 border-base-content/10 {tone.ring}"
                    style="--value:{analysis.score}; --size:6rem; --thickness: 0.5rem;"
                    role="progressbar"
                    aria-label={m.card_score_aria({ score: analysis.score, grade: analysis.rating.grade })}
                >
                    <span class="text-4xl font-black">{analysis.score}</span>
                </div>

                <div class="flex flex-col border-l pl-4 border-base-content/10">
                    <span class="text-xs uppercase tracking-widest opacity-60 font-bold">{m.summary_energy()}</span>
                    <div class="flex items-baseline gap-1">
                        {#if analysis.calories.available}
                            <span class="text-3xl font-black">{analysis.calories.value}</span>
                            <span class="text-sm font-bold opacity-60">{analysis.calories.unit}</span>
                        {:else}
                            <span class="text-3xl font-black opacity-40">—</span>
                        {/if}
                    </div>
                    <span class="text-lg font-medium {tone.text}">{m.summary_score_label({ label: localizedRatingLabel(analysis.rating) })}</span>
                </div>
            </div>
        {:else if analysis.calories.available}
            <div class="flex items-center gap-6">
                <div
                    class="radial-progress border-8 border-base-content/10 text-base-content/25 opacity-50"
                    style="--size:6rem; --thickness: 0rem;"
                    role="img"
                    aria-label={m.card_not_rated()}
                >
                    <span class="text-3xl font-black text-base-content/50">—</span>
                </div>

                <div class="flex flex-col border-l pl-4 border-base-content/10">
                    <span class="text-xs uppercase tracking-widest opacity-60 font-bold">{m.summary_energy()}</span>
                    <div class="flex items-baseline gap-1">
                        <span class="text-3xl font-black">{analysis.calories.value}</span>
                        <span class="text-sm font-bold opacity-60">{analysis.calories.unit}</span>
                    </div>
                    <span class="text-base font-medium text-base-content/50">{m.card_not_rated()}</span>
                </div>
            </div>
        {:else}
            <div class="badge badge-lg bg-base-200 border-base-300 text-base-content/60 font-semibold py-4 px-5">
                {m.card_not_rated()}
            </div>
        {/if}
    </div>
</div>
