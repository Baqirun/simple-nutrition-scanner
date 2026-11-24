<script lang="ts">
    import { onDestroy } from "svelte";
    import { Scanner } from "$lib/ui/scanner.svelte";
    import { Image } from "@lucide/svelte";
    import * as m from "$lib/paraglide/messages";

    let fileInput: HTMLInputElement | undefined = $state();
    let pausedForPicker = false;
    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    let focusListenerActive = false;

    function cleanupFocusListener() {
        if (focusTimer !== null) {
            clearTimeout(focusTimer);
            focusTimer = null;
        }
        if (focusListenerActive && typeof window !== "undefined") {
            window.removeEventListener("focus", handleWindowFocus);
            focusListenerActive = false;
        }
    }

    function resumeIfNeeded() {
        cleanupFocusListener();
        if (!pausedForPicker) return;

        pausedForPicker = false;
        if (Scanner.status === "paused" && !Scanner.isProcessing) {
            void Scanner.resume();
        }
    }

    function handleWindowFocus() {
        if (focusTimer !== null) clearTimeout(focusTimer);
        focusTimer = setTimeout(() => {
            resumeIfNeeded();
        }, 350);
    }

    function openFilePicker() {
        if (Scanner.isProcessing || !fileInput) return;

        cleanupFocusListener();
        pausedForPicker = Scanner.pause();

        if (pausedForPicker && typeof window !== "undefined") {
            window.addEventListener("focus", handleWindowFocus, { once: true });
            focusListenerActive = true;
        }

        fileInput.click();
    }

    function handleCancel() {
        resumeIfNeeded();
    }

    async function handleFileChange(e: Event) {
        cleanupFocusListener();

        const input = e.target as HTMLInputElement;
        const file = input.files?.item(0) ?? null;
        input.value = "";

        const shouldResume = pausedForPicker;
        pausedForPicker = false;

        if (file) {
            await Scanner.processImage(file);
        }

        if (shouldResume && Scanner.status === "paused" && !Scanner.isProcessing) {
            void Scanner.resume();
        }
    }

    onDestroy(() => {
        cleanupFocusListener();
    });
</script>

<button
    type="button"
    class="btn btn-sm btn-primary gap-1.5 shrink-0"
    onclick={openFilePicker}
    disabled={Scanner.isProcessing}
>
    <Image class="h-4 w-4" />
    <span>{m.scan_image_button()}</span>
</button>

<input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    class="hidden"
    onchange={handleFileChange}
    oncancel={handleCancel}
    disabled={Scanner.isProcessing}
/>
