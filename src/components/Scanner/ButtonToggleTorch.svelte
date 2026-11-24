<script lang="ts">
    import { Flashlight } from "@lucide/svelte";
    import { Scanner } from "$lib/ui/scanner.svelte";
    import { Torch } from "$lib/ui/torch.svelte";
    import * as m from "$lib/paraglide/messages";

    const disabled = $derived(Scanner.status !== "scanning" || Scanner.isProcessing);
</script>

<button
    type="button"
    class="btn btn-sm btn-square {Torch.torchEnabled ? 'btn-warning' : 'btn-ghost'}"
    aria-label={m.scan_torch_aria()}
    aria-pressed={Torch.torchEnabled}
    {disabled}
    onclick={() => Torch.toggle()}
>
    <Flashlight class="h-4 w-4" />
</button>
