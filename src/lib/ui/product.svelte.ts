import { ProductRepository } from "$lib/services/productRepository";
import { ProductService } from "$lib/services/productService";
import type { Product } from "$lib/types/product";
import type { LookupResult } from "$lib/types/result";
import { ui } from "./alert.svelte";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import * as m from "$lib/paraglide/messages";

class ProductStore {
    items = $state<Product[]>([]);
    loading = $state(false);
    current = $state<Product | undefined>();
    /** Why `current` is empty, so the detail page can say more than "not found". */
    currentError = $state<string | undefined>();

    #repo = new ProductRepository();
    #service = new ProductService({ repo: this.#repo });

    constructor() {
        this.#repo.stream().subscribe((products) => {
            this.items = products;
        });
    }

    async lookup(code: string | undefined) {
        if (!code || this.loading) return;

        this.loading = true;

        try {
            const result = await this.#service.lookup(code);

            switch (result.type) {
                case "found":
                    ui.show(
                        result.fromCache
                            ? m.toast_loaded_from_history()
                            : m.toast_product_found(),
                        "success",
                    );
                    goto(resolve(`/history/${result.code}`));
                    break;

                case "not_found":
                    ui.show(
                        m.toast_product_not_found_code({ code: result.code }),
                        "warning",
                    );
                    break;

                case "rate_limited":
                    ui.show(m.toast_rate_limited(), "warning");
                    break;

                case "blacklisted":
                    ui.show(
                        m.toast_blacklisted(),
                        "info",
                    );
                    break;

                case "error":
                    ui.show(result.message, "error");
                    break;
            }
        } finally {
            this.loading = false;
        }
    }

    /**
     * Load the product a detail route points at. The result is reported to the
     * caller so the page can distinguish "loading", "missing" and "offline".
     */
    async ensure(code: string | undefined): Promise<LookupResult | undefined> {
        if (!code) return undefined;

        this.loading = true;
        this.currentError = undefined;

        try {
            // Try the local copy first: it is instant and never rate limited.
            const existing = await this.#repo.getById(code);

            if (existing) {
                this.current = existing;
                return { type: "found", code, fromCache: true };
            }

            const result = await this.#service.lookup(code);

            if (result.type === "found") {
                this.current = await this.#repo.getById(result.code);
                return result;
            }

            this.current = undefined;
            this.currentError = describeFailure(result);
            ui.show(this.currentError, result.type === "not_found" ? "warning" : "error");
            return result;
        } finally {
            this.loading = false;
        }
    }

    async remove(code: string | undefined) {
        if (!code) return;

        await this.#repo.remove(code);

        if (this.current?.code === code) {
            this.current = undefined;
        }
    }

    async clear() {
        await this.#repo.clear();
    }
}

function describeFailure(result: LookupResult): string {
    switch (result.type) {
        case "not_found":
            return m.error_not_found_off();
        case "rate_limited":
            return m.error_rate_limited_off();
        case "blacklisted":
            return m.error_blacklisted_off();
        case "error":
            return result.message;
        default:
            return m.product_not_found();
    }
}

export const productStore = new ProductStore();
