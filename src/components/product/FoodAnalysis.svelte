<script lang="ts">
    import type { ProductAnalysis, ScoreReason } from "$lib/models/productAnalysis";
    import type { NutrientLevel } from "$lib/types/product";
    import {
        localizedNutrientLabel,
        localizedNutrientLevel,
        localizedScoreReason
    } from "$lib/utils/helpers/localizedProduct";
    import * as m from "$lib/paraglide/messages";
    import CircleCheck from "@lucide/svelte/icons/circle-check";
    import TriangleAlert from "@lucide/svelte/icons/triangle-alert";

    let { analysis }: { analysis: ProductAnalysis } = $props();

    const levelColors: Record<NutrientLevel, string> = {
        low: "bg-green-500",
        moderate: "bg-yellow-500",
        high: "bg-red-500"
    };

    function pointsClass(reason: ScoreReason): string {
        if (reason.points < 0) return "text-error";
        if (reason.points > 0) return "text-success";
        return "opacity-50";
    }

    function formatPoints(reason: ScoreReason): string {
        if (reason.points > 0) return `+${reason.points}`;
        return `${reason.points}`;
    }
</script>

<!-- score breakdown: makes the rating explainable instead of a black box -->
{#if analysis.isRated}
    <div class="bg-base-100 rounded-3xl p-5 shadow-sm">
        <h3 class="font-bold mb-4">{m.analysis_why_score()}</h3>

        <ul class="space-y-2">
            {#each analysis.scoreReasons as reason (reason.id)}
                <li class="flex items-center justify-between text-sm">
                    <span class="opacity-70">{localizedScoreReason(reason, analysis)}</span>
                    <span class="font-bold {pointsClass(reason)}">
                        {formatPoints(reason)}
                    </span>
                </li>
            {/each}
        </ul>
    </div>
{/if}

{#if analysis.hasNutrientData}
    <div class="bg-base-100 rounded-3xl p-5 shadow-sm">
        <h3 class="font-bold mb-4 flex items-center gap-2">
            <CircleCheck class="text-primary" />
            {m.analysis_per_100g()}
        </h3>

        <div class="grid grid-cols-2 gap-3">
            {#each analysis.nutrients as point (point.id)}
                {@const isMissing = point.value === null && !point.level}
                <div class="bg-base-200 rounded-2xl p-3 grid grid-cols-2 items-center text-center {isMissing ? 'opacity-45' : ''}">
                    <div class="flex flex-col">
                        <span class="text-2xl mb-1">{point.icon}</span>
                        <span class="text-xs opacity-60 uppercase font-bold tracking-tighter">{localizedNutrientLabel(point.id)}</span>
                    </div>
                    <div class="flex flex-col items-center">
                        <div class="flex flex-row gap-2">
                            <span class="font-black uppercase">
                                {point.value !== null ? `${point.value} ${point.unit}` : "—"}
                            </span>
                            {#if point.level}
                                <div class="rounded-full w-2 h-2 my-auto {levelColors[point.level]}"></div>
                            {/if}
                        </div>
                        {#if point.level}
                            <span class="text-xs uppercase opacity-75">{localizedNutrientLevel(point.level)}</span>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
{:else if analysis.exists}
    <div class="bg-warning/10 border border-warning/20 rounded-3xl px-5 py-4 flex items-center gap-3 text-sm">
        <TriangleAlert class="w-5 h-5 text-warning shrink-0" />
        <p class="text-base-content/75">{m.analysis_no_nutrition()}</p>
    </div>
{/if}
