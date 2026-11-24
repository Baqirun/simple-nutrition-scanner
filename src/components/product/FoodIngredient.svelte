<script lang="ts">
    import type { ProductAnalysis } from "$lib/models/productAnalysis";
    import * as m from "$lib/paraglide/messages";

    let { analysis }: { analysis: ProductAnalysis } = $props();
</script>

{#if analysis.ingredients}
    <div class="bg-base-100 rounded-3xl p-5 shadow-sm">
        <h3 class="font-bold mb-2">
            {m.ingredients_title()}
            {#if !analysis.ingredients.isEnglish}
                <i class="font-light">{m.ingredients_non_english()}</i>
            {/if}
        </h3>
        <p class="text-sm opacity-70 leading-relaxed italic">
            {analysis.ingredients.text}
        </p>
    </div>
{/if}
