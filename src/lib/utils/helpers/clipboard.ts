import { ui } from "$lib/ui/alert.svelte";
import * as m from "$lib/paraglide/messages";

export function copyToClip(text: string) {
    navigator.clipboard.writeText(text)
        .then(() => {
            ui.show(m.toast_copy_success(), "success");
        })
        .catch((err) => {
            ui.show(err instanceof Error ? err.message : m.toast_copy_error(), "error");
        });
}
