<script lang="ts">
	import { onMount } from 'svelte';
	import { Download } from '@lucide/svelte'
	import { logger } from '$lib/ui/logger.svelte';
	import * as m from '$lib/paraglide/messages';

	let deferredPrompt = $state<any>(null);
	let canInstall = $state(false);

	onMount(() => {
		const handler = (e: Event) => {
			deferredPrompt = e;
			canInstall = true;
		};

		window.addEventListener('beforeinstallprompt', handler);

		return () => {
			window.removeEventListener('beforeinstallprompt', handler);
		};
	});

	async function installApp() {
		if (!deferredPrompt) return;

		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === 'accepted') {
			logger.log('User accepted the install prompt');
		}

		deferredPrompt = null;
		canInstall = false;
	}
</script>


{#if canInstall}
	<button
		aria-label={m.pwa_install_aria()}
		onclick={installApp}
		class="btn btn-primary btn-sm normal-case mr-2"
	>
		<Download/>
		{m.pwa_install()}
	</button>
{/if}
