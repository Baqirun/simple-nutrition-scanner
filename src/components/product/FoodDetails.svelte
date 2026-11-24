<script lang="ts">
    import type { EcoScoreGrade } from "$lib/types/product";
    import type { ProductAnalysis } from "$lib/models/productAnalysis";
    import type { AdditiveRisk } from "$lib/services/additiveService";
    import CircleQuestionMark from "@lucide/svelte/icons/circle-question-mark";

    let { analysis }: { analysis: ProductAnalysis } = $props();

    const ecoStyles: Record<EcoScoreGrade, { badge: string; label: string }> = {
        "a-plus": { badge: "bg-green-100 text-green-700", label: "Very low impact" },
        a: { badge: "bg-green-100 text-green-700", label: "Very low impact" },
        b: { badge: "bg-lime-100 text-lime-700", label: "Low impact" },
        c: { badge: "bg-yellow-100 text-yellow-700", label: "Moderate impact" },
        d: { badge: "bg-orange-100 text-orange-700", label: "High impact" },
        e: { badge: "bg-red-100 text-red-700", label: "Very high impact" },
        f: { badge: "bg-red-100 text-red-700", label: "Very high impact" }
    };

    function ecoGradeLabel(grade: EcoScoreGrade) {
        return grade === "a-plus" ? "A+" : grade.toUpperCase();
    }

    const novaLabels: Record<number, string> = {
        1: 'Unprocessed',
        2: 'Culinary ingredients',
        3: 'Processed',
        4: 'Ultra-processed'
    };

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
         Composition
     </h3>

     <div class="space-y-4">
         {#if analysis.novaGroup}
         <div class="flex items-center justify-between text-sm">
             <div class="flex items-center gap-3">
                 <div class="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-sm font-bold text-yellow-700">
                     {analysis.novaGroup}
                 </div>
                 <span class="font-medium">Processing (NOVA)</span>
             </div>
             <div class="text-xs opacity-50 max-w-37.5 text-right">
                 {novaLabels[analysis.novaGroup] || 'Unknown'}
             </div>
         </div>
         {/if}

         {#if analysis.ecoscoreGrade}
         {@const eco = ecoStyles[analysis.ecoscoreGrade]}
         <div class="flex items-center justify-between text-sm">
             <div class="flex items-center gap-3">
                 <div class="w-8 h-8 rounded-lg {eco.badge} flex items-center justify-center text-sm font-bold uppercase">
                     {ecoGradeLabel(analysis.ecoscoreGrade)}
                 </div>
                 <span class="font-medium">Eco-Score</span>
             </div>
             <span class="text-xs opacity-50 uppercase">{eco.label}</span>
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
                <span class="font-medium">Additives ({analysis.additives.length})</span>
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
                         <span class="font-medium">No additives found</span>
                     </div>
                 </div>
             {/if}
         </div>
     </div>
 </div>
