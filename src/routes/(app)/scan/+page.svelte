<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Camera, CameraOff, Pause, Play, RotateCw, Upload } from "@lucide/svelte";
    import { Scanner } from "$lib/ui/scanner.svelte";
    import { Torch } from "$lib/ui/torch.svelte";
    import ScanOverlay from "$components/Scanner/ScanOverlay.svelte";
    import ButtonFileScan from "$components/Scanner/ButtonFileScan.svelte";
    import ButtonToggleTorch from "$components/Scanner/ButtonToggleTorch.svelte";
    import * as m from "$lib/paraglide/messages";

    let scannerContainer: HTMLDivElement;
    let barcodeInput = $state("");
    let isDragging = $state(false);
    let dragDepth = 0;

    const statusText = $derived.by(() => {
        if (Scanner.isProcessing) return m.scan_processing();
        switch (Scanner.status) {
            case "starting":
                return m.scan_status_starting();
            case "scanning":
                return m.scan_status_scanning();
            case "paused":
                return m.scan_status_paused();
            case "error":
                return Scanner.errorMessage ?? m.scan_status_unavailable();
            default:
                return m.scan_instruction();
        }
    });

    const statusDotClass = $derived.by(() => {
        if (Scanner.isProcessing) return "bg-primary animate-pulse";
        switch (Scanner.status) {
            case "scanning":
                return "bg-success animate-pulse";
            case "starting":
            case "paused":
                return "bg-warning";
            case "error":
                return "bg-error";
            default:
                return "bg-base-content/30";
        }
    });

    function handleManualSubmit(e: SubmitEvent) {
        e.preventDefault();
        void Scanner.lookupCode(barcodeInput);
    }

    function handleDragEnter(e: DragEvent) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
        dragDepth++;
        isDragging = true;
    }

    function handleDragOver(e: DragEvent) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
    }

    function handleDragLeave(e: DragEvent) {
        if (!isDragging) return;
        e.preventDefault();
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) isDragging = false;
    }

    async function handleDrop(e: DragEvent) {
        e.preventDefault();
        dragDepth = 0;
        isDragging = false;

        const file = e.dataTransfer?.files?.item(0) ?? null;
        if (!file || !file.type.startsWith("image/")) return;

        const wasPaused = Scanner.pause();
        await Scanner.processImage(file);
        if (wasPaused && Scanner.status === "paused" && !Scanner.isProcessing) {
            void Scanner.resume();
        }
    }

    onMount(() => {
        void Scanner.start(scannerContainer);
    });

    onDestroy(() => {
        Scanner.stop();
        Torch.reset();
    });
</script>

<svelte:head>
    <title>{m.scan_title()} | {m.app_title_suffix()}</title>
</svelte:head>

<main class="p-5 pb-24 max-w-lg mx-auto space-y-4">
    <section class="bg-base-200 rounded-box border border-base-300 shadow-sm overflow-hidden">
        <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-base-300">
            <div class="flex items-center gap-2 min-w-0">
                <Camera class="h-4 w-4 text-primary shrink-0" />
                <h1 class="text-sm font-bold truncate">{m.scan_title()}</h1>
            </div>

            <div class="flex items-center gap-1 shrink-0">
                <ButtonToggleTorch />

                {#if Scanner.status === "scanning"}
                    <button
                        type="button"
                        class="btn btn-sm btn-square btn-ghost"
                        aria-label={m.scan_pause_aria()}
                        disabled={Scanner.isProcessing}
                        onclick={() => Scanner.pause()}
                    >
                        <Pause class="h-4 w-4" />
                    </button>
                {:else if Scanner.status === "paused"}
                    <button
                        type="button"
                        class="btn btn-sm btn-square btn-ghost text-primary"
                        aria-label={m.scan_resume_aria()}
                        disabled={Scanner.isProcessing}
                        onclick={() => Scanner.resume()}
                    >
                        <Play class="h-4 w-4" />
                    </button>
                {:else if Scanner.status === "error"}
                    <button
                        type="button"
                        class="btn btn-sm btn-square btn-ghost text-primary"
                        aria-label={m.scan_retry_button()}
                        disabled={Scanner.isProcessing}
                        onclick={() => Scanner.retry()}
                    >
                        <RotateCw class="h-4 w-4" />
                    </button>
                {/if}
            </div>
        </div>

        <div
            role="region"
            aria-label={m.scan_title()}
            ondragenter={handleDragEnter}
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            ondrop={handleDrop}
            class="relative aspect-square sm:aspect-4/3 w-full overflow-hidden bg-black transition-shadow {isDragging ? 'ring-2 ring-inset ring-primary' : ''}"
        >
            <div bind:this={scannerContainer} class="scanner-container absolute inset-0 z-0 flex items-center justify-center p-3"></div>

            <ScanOverlay active={Scanner.status === "scanning" && !Scanner.isProcessing && !isDragging} />

            {#if isDragging}
                <div class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/75 backdrop-blur-xs text-white px-4 text-center">
                    <Upload class="h-7 w-7 text-primary" />
                    <p class="text-sm font-medium">{m.scan_drop_hint()}</p>
                </div>
            {:else if Scanner.isProcessing}
                <div class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-xs text-white px-4 text-center">
                    <span class="loading loading-ring loading-lg text-primary"></span>
                    <p class="text-sm font-medium tracking-wide">{m.scan_processing()}</p>
                </div>
            {:else if Scanner.status === "starting"}
                <div class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 text-white/80 px-4 text-center">
                    <span class="loading loading-spinner loading-md text-primary"></span>
                    <p class="text-xs font-medium">{m.scan_status_starting()}</p>
                </div>
            {:else if Scanner.status === "paused"}
                <div class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/65 backdrop-blur-xs text-white px-4 text-center">
                    <CameraOff class="h-7 w-7 text-white/75" />
                    <p class="text-sm font-medium">{m.scan_status_paused()}</p>
                    <button
                        type="button"
                        class="btn btn-sm btn-primary gap-1.5"
                        onclick={() => Scanner.resume()}
                    >
                        <Play class="h-4 w-4" />
                        <span>{m.scan_resume_button()}</span>
                    </button>
                </div>
            {:else if Scanner.status === "error"}
                <div class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 text-white px-6 text-center">
                    <CameraOff class="h-7 w-7 text-error" />
                    <p class="text-sm font-medium">{Scanner.errorMessage ?? m.scan_status_unavailable()}</p>
                    <button
                        type="button"
                        class="btn btn-sm btn-primary gap-1.5"
                        onclick={() => Scanner.retry()}
                    >
                        <RotateCw class="h-4 w-4" />
                        <span>{m.scan_retry_button()}</span>
                    </button>
                </div>
            {/if}
        </div>

        <div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-base-300">
            <div class="flex items-center gap-2 min-w-0">
                <span class="h-2 w-2 rounded-full shrink-0 {statusDotClass}"></span>
                <p class="text-xs opacity-75 truncate">{statusText}</p>
            </div>

            <ButtonFileScan />
        </div>
    </section>

    <section class="bg-base-200 rounded-box border border-base-300 p-4 space-y-2.5">
        <label
            for="scan-manual-barcode"
            class="block text-xs font-semibold uppercase tracking-wider opacity-60"
        >
            {m.scan_manual_label()}
        </label>

        <form class="join w-full" onsubmit={handleManualSubmit}>
            <input
                id="scan-manual-barcode"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                bind:value={barcodeInput}
                placeholder={m.home_barcode_placeholder()}
                class="input input-bordered join-item w-full focus:outline-none focus:input-primary"
                disabled={Scanner.isProcessing}
            />
            <button
                type="submit"
                class="btn btn-primary join-item px-5"
                disabled={Scanner.isProcessing || !barcodeInput.trim()}
            >
                {#if Scanner.isProcessing}
                    <span class="loading loading-spinner loading-xs"></span>
                {:else}
                    {m.home_check_button()}
                {/if}
            </button>
        </form>
    </section>
</main>

<style>
    .scanner-container :global(video) {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 0.5rem;
    }
</style>
