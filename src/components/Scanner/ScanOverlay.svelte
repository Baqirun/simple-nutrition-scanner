<script lang="ts">
    type Props = {
        active?: boolean;
    };

    let { active = false }: Props = $props();
</script>

<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
    <div class="relative aspect-4/3 w-1/2 max-w-[220px]">
        <span class="absolute top-0 left-0 h-5 w-5 rounded-tl-md border-t-2 border-l-2 border-primary"></span>
        <span class="absolute top-0 right-0 h-5 w-5 rounded-tr-md border-t-2 border-r-2 border-primary"></span>
        <span class="absolute bottom-0 left-0 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-primary"></span>
        <span class="absolute bottom-0 right-0 h-5 w-5 rounded-br-md border-b-2 border-r-2 border-primary"></span>

        {#if active}
            <div class="absolute inset-x-2 top-0 h-0.5 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)] animate-scan-move"></div>
        {/if}
    </div>
</div>

<style>
    @keyframes scan-move {
        0%, 100% {
            top: 8%;
            opacity: 0.4;
        }
        50% {
            top: 90%;
            opacity: 1;
        }
    }

    .animate-scan-move {
        animation: scan-move 2.2s ease-in-out infinite;
    }
</style>
