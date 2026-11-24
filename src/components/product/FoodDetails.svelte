<script lang="ts">
    import type { EcoScoreGrade } from "$lib/types/product";
    import type { ProductAnalysis } from "$lib/models/productAnalysis";
    import type { AdditiveRisk } from "$lib/services/additiveService";
    import { localizedEcoLabel, localizedNovaLabel } from "$lib/utils/helpers/localizedProduct";
    import * as m from "$lib/paraglide/messages";
    import CircleQuestionMark from "@lucide/svelte/icons/circle-question-mark";

    let { analysis }: { analysis: ProductAnalysis } = $props();

    const ecoBadges: Record<EcoScoreGrade, string> = {
        "a-plus": "bg-green-100 text-green-700",
        a: "bg-green-100 text-green-700",
        b: "bg-lime-100 text-lime-700",
        c: "bg-yellow-100 text-yellow-700",
        d: "bg-orange-100 text-orange-700",
        e: "bg-red-100 text-red-700",
        f: "bg-red-100 text-red-700"
    };

    function ecoGradeLabel(grade: EcoScoreGrade) {
        return grade === "a-plus" ? "A+" : grade.toUpperCase();
    }

    const riskColors: Record<AdditiveRisk, string> = {
        3: 'bg-red-100 text-red-700 border-red-200',
        2: 'bg-orange-100 text-orange-700 border-orange-200',
        1: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        0: 'bg-base-200 text-base-content/70 border-base-300'
    };
</script>


 <div class="bg-base-100 rounded-3xl p-5 shadow-sm">
     <h3 class="font-bold mb-4 flex items-center gap-2 tracking-wider opacity-75">
         <CircleQuestionMark/>
         {m.details_composition()}
     </h3>

     <div class="space-y-4">
         {#if analysis.novaGroup}
         <div class="flex items-center justify-between text-sm">
             <div class="flex items-center gap-3">
                 <div class="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-sm font-bold text-yellow-700">
                     {analysis.novaGroup}
                 </div>
                 <span class="font-medium">{m.details_nova()}</span>
             </div>
             <div class="text-xs opacity-50 max-w-37.5 text-right">
                 {localizedNovaLabel(analysis.novaGroup)}
             </div>
         </div>
         {/if}

         {#if analysis.ecoscoreGrade}
         {@const badge = ecoBadges[analysis.ecoscoreGrade]}
         <div class="flex items-center justify-between text-sm">
             <div class="flex items-center gap-3">
                 <div class="w-8 h-8 rounded-lg {badge} flex items-center justify-center text-sm font-bold uppercase">
                     {ecoGradeLabel(analysis.ecoscoreGrade)}
                 </div>
                 <span class="font-medium">{m.details_ecoscore()}</span>
             </div>
             <span class="text-xs opacity-50 uppercase">{localizedEcoLabel(analysis.ecoscoreGrade)}</span>
         </div>
         {/if}

         {#if analysis.novaGroup || analysis.ecoscoreGrade}
         <div class="divider my-1"></div>
         {/if}

         <div class="text-sm">
         {#if analysis.additives.length > 0}
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg {analysis.score < 50 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'} flex items-center justify-center text-sm font-bold">
                    !
                </div>
                <span class="font-medium">{m.details_additives_count({ count: analysis.additives.length })}</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              {#each analysis.additives as additive (additive.tag)}
                <div class="group relative">
                  <span class="badge badge-sm border {riskColors[additive.risk]} text-[10px] font-bold py-3 uppercase" title={additive.tag}>
                    {additive.name}
                  </span>
                </div>
              {/each}
            </div>
          {:else}
                 <div class="flex items-center justify-between">
                     <div class="flex items-center gap-3">
                         <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-700">
                             ✓
                         </div>
                         <span class="font-medium">{m.details_no_additives()}</span>
                     </div>
                 </div>
             {/if}
         </div>
     </div>
 </div>
