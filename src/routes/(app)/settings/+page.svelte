<script lang="ts">
    import { productStore } from '$lib/ui/product.svelte';
    import { settings} from '$lib/core/settings.svelte';
    import { APP_ID , APP_NAME, APP_VERSION, DEV_CONTACT } from '$lib/core/appInfo';
    import { copyToClip } from '$lib/utils/helpers/clipboard';
    import { logger } from '$lib/ui/logger.svelte';
    import { locale, LOCALE_LABELS } from '$lib/ui/locale.svelte';
    import * as m from '$lib/paraglide/messages';
    import { Trash2 } from '@lucide/svelte';

    let showConfirm = $state(false);
    let showConsole = $state(false)

    async function handleClearAll() {
        await productStore.clear();
        showConfirm = false;
        // Optional: show a toast or redirect
    }
</script>

<main class="p-5 pb-24 max-w-md mx-auto">
    <section class="mb-8">
        <h2 class="text-sm font-semibold uppercase tracking-wider opacity-50 mb-4">{m.settings_language_section()}</h2>
        <div class="bg-base-200 rounded-box border border-base-300 p-5">
            <p class="text-xs opacity-60 mb-4 leading-relaxed">
                {m.settings_language_description()}
            </p>
            <div class="join w-full">
                {#each locale.available as lang}
                    <button
                        class="join-item btn btn-sm flex-1 {locale.current === lang ? 'btn-accent' : ''}"
                        onclick={() => locale.set(lang)}
                    >
                        {LOCALE_LABELS[lang]}
                    </button>
                {/each}
            </div>
        </div>
    </section>

    <section class="mb-8">
        <h2 class="text-sm font-semibold uppercase tracking-wider opacity-50 mb-4">{m.settings_data_section()}</h2>

        <div class="bg-base-200 rounded-box overflow-hidden border border-base-300">
            <button
                onclick={() => showConfirm = true}
                class="flex items-center justify-between w-full p-4 hover:bg-base-300 transition-colors text-error cursor-pointer"
            >
                <div class="flex items-center gap-3">
                    <Trash2/>
                    <span class="font-medium">{m.settings_clear_history()}</span>
                </div>
                <span class="text-xs opacity-50">{m.settings_items_count({ count: productStore.items.length })}</span>
            </button>
        </div>
    </section>

    <section class="mb-8">
        <h2 class="text-sm font-semibold uppercase tracking-wider opacity-50 mb-4">{m.settings_scoring_section()}</h2>
        <div class="bg-base-200 rounded-box border border-base-300 p-5">
            <p class="text-xs opacity-60 mb-4 leading-relaxed">
                {m.settings_scoring_desc_prefix()} <b>{m.settings_score_nutriscore()}</b> {m.settings_scoring_desc_nutriscore()} <b>{m.settings_score_app()}</b> {m.settings_scoring_desc_app()}
            </p>

            <div class="join w-full">
                <button
                    class="join-item btn btn-sm flex-1 {settings.useCustomScore === 'nutriscore' ? 'btn-accent' : ''}"
                    onclick={() => settings.useCustomScore = 'nutriscore'}
                >
                    {m.settings_score_nutriscore()}
                </button>
                <button
                    class="join-item btn btn-sm flex-1 {settings.useCustomScore === 'app' ? 'btn-accent' : ''}"
                    onclick={() => settings.useCustomScore = 'app'}
                >
                    {m.settings_score_app()}
                </button>
            </div>

            {#if settings.useCustomScore === 'app'}
                <div class="mt-4 p-3 bg-base-300/50 rounded-lg border border-white/5">
                    <ul class="text-[11px] space-y-1 opacity-70">
                        <li class="flex items-center gap-2">✓ {m.settings_app_factor_nutriscore()}</li>
                        <li class="flex items-center gap-2">✓ {m.settings_app_factor_additives()}</li>
                        <li class="flex items-center gap-2">✓ {m.settings_app_factor_organic()}</li>
                    </ul>
                </div>
            {/if}
        </div>
    </section>

    <section class='mb-8 '>
      <h2 class="text-sm font-semibold uppercase tracking-wider opacity-50 mb-4">{m.settings_personalization_section()}</h2>

      <div class="bg-base-200 rounded-box border border-base-300 p-5">

	      <div class="form-control w-full">
	        <label class="label pt-0" for="app-name">
	          <span class="label-text font-medium mb-2">{m.settings_app_name()}</span>
	        </label>
	        <input
	          id="app-name"
	          type="text"
	          placeholder={m.settings_app_name_placeholder()}
	          class="input input-bordered w-full"
	          bind:value={settings.appName}
	        />
	      </div>

				<div class="divider"></div>

        <div class="space-y-2">
        	<label class="label pt-0" for="landing-page">
	          <span class="label-text font-medium mb-2">{m.settings_landing_content()}</span>
	        </label>

          <label class="input input-sm flex items-center gap-2 h-11 w-full">
            <span class="text-xs font-bold opacity-50 w-12 text-success">{m.settings_landing_title_label()}</span>
            <input type="text" class="grow font-medium" bind:value={settings.landingTitle} placeholder={m.settings_landing_title_placeholder()} />
          </label>

          <label class="input input-sm flex items-center gap-2 h-11 w-full">
            <span class="text-xs font-bold opacity-50 w-12 text-success">{m.settings_landing_text_label()}</span>
            <input type="text" class="grow font-medium" bind:value={settings.landingSubtitle} placeholder={m.settings_landing_text_placeholder()} />
          </label>
        </div>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider opacity-50 mb-4">{m.settings_console_section()}</h2>
      <div class="bg-base-200 rounded-box border border-base-300 overflow-hidden">
	     	<label class="label text-sm p-5 justify-between flex border-b-2 border-accent">
          <span>{m.settings_show_console()}</span>
          <input type="checkbox" class="toggle toggle-accent" bind:checked={showConsole}/>
        </label>

        <!-- show console if toggled -->
        {#if showConsole}
	        <div class="h-48 overflow-y-auto p-3 font-mono text-[10px] bg-black text-green-400">
	          {#each logger.logs as log}
	              <div class="border-b border-white/10 py-1">{log}</div>
	          {/each}
	          {#if logger.logs.length === 0}
	              <span class="opacity-30">{m.settings_no_logs()}</span>
	          {/if}
	        </div>
        {/if}

        <div class="flex divide-x divide-base-300">
          <button
            onclick={() => logger.copyToClipboard()}
            class="flex-1 p-3 py-5 cursor-pointer text-xs font-bold hover:bg-base-300 transition-colors">
            {m.settings_copy_clipboard()}
          </button>
          <button
            onclick={() => logger.clear()}
            class="flex-1 p-3 py-5 cursor-pointer text-xs font-bold text-error hover:bg-base-300 transition-colors">
            {m.settings_clear()}
          </button>
        </div>
      </div>
    </section>

    <section class="mb-8">
        <h2 class="text-sm font-semibold uppercase tracking-wider opacity-50 mb-4">{m.settings_about_section()}</h2>
        <div class="bg-base-200 rounded-box p-5 border border-base-300 space-y-3">
            <div class="flex justify-between text-sm">
                <span class="opacity-70">{m.settings_version()}</span>
                <span class="font-mono">{ APP_VERSION }</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="opacity-70">{m.settings_database()}</span>
                <span class="font-mono text-success">{m.settings_database_status()}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="opacity-70 flex-none">{m.settings_app_id()}</span>
                <button class="text-xs btn btn-xs btn-accent font-mono font-light opacity-70" onclick={() => copyToClip(APP_ID)}>{m.settings_click_to_copy()}</button>
            </div>
            <div class="divider"></div>
            <p class="text-xs opacity-50 leading-relaxed">
                { settings.appName } <i>({ APP_NAME })</i> {m.settings_about_description()}
            </p>
        </div>
    </section>
</main>

{#if showConfirm}
    <div class="modal modal-open modal-bottom sm:modal-middle">
        <div class="modal-box">
            <h3 class="font-bold text-lg text-error">{m.settings_modal_delete_title()}</h3>
            <p class="py-4">{m.settings_modal_delete_body()}</p>
            <div class="modal-action">
                <button class="btn btn-ghost" onclick={() => showConfirm = false}>{m.settings_modal_cancel()}</button>
                <button class="btn btn-error" onclick={handleClearAll}>{m.settings_modal_confirm_delete()}</button>
            </div>
        </div>
        <button class="modal-backdrop" onclick={() => showConfirm = false}>{m.settings_modal_close()}</button>
    </div>
{/if}
