import { ui } from "$lib/ui/alert.svelte";
import { logger } from "$lib/ui/logger.svelte";
import { Scanner } from "$lib/ui/scanner.svelte";
import * as m from "$lib/paraglide/messages";

class ToggleTorch {
    // Use the $state rune for reactive UI updates
    torchEnabled = $state(false);

    async toggle() {
        if (this.torchEnabled) {
            await this.#disable();
        } else {
            await this.#enable();
        }
    }

    reset() {
        this.torchEnabled = false;
    }

    async #enable() {
        try {
            await Scanner.setTorch(true);
            this.torchEnabled = true;
        } catch (error) {
            this.torchEnabled = false;
            this.#handleError(error);
        }
    }

    async #disable() {
        try {
            await Scanner.setTorch(false);
            this.torchEnabled = false;
        } catch (error) {
            this.torchEnabled = false;
            this.#handleError(error);
        }
    }

    #handleError(error: any) {
        logger.error("Torch control failed:", error);
        ui.show(m.toast_torch_unavailable(), "error");
    }
}

export const Torch = new ToggleTorch();
