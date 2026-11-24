// lib/ui/scanner.svelte.ts
import { ScannerEngine } from "$lib/services/scannerEngine";
import { ProductService } from "$lib/services/productService";
import { ProductRepository } from "$lib/services/productRepository";
import { ui } from "./alert.svelte";
import { logger } from "./logger.svelte";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import * as m from "$lib/paraglide/messages";

export type ScannerStatus =
    | "idle"
    | "starting"
    | "scanning"
    | "paused"
    | "error";

class ScannerController {
    status = $state<ScannerStatus>("idle");
    errorMessage = $state<string | null>(null);
    isProcessing = $state(false);
    isActive = $derived(this.status === "scanning" || this.status === "paused");

    #engine = new ScannerEngine();
    #service = new ProductService({ repo: new ProductRepository() });
    #target: HTMLElement | null = null;

    async start(target: HTMLElement) {
        this.#target = target;

        if (this.status === "starting" || this.status === "scanning") return;
        if (this.status === "paused") {
            await this.resume();
            return;
        }

        this.status = "starting";
        this.errorMessage = null;

        try {
            const started = await this.#engine.start(target, (code) => {
                if (!this.isProcessing && this.status === "scanning") {
                    void this.#handleCode(code);
                }
            });

            if (started) {
                this.status = "scanning";
            }
        } catch (err: unknown) {
            if (this.status === "starting") {
                const message = this.#getCameraErrorMessage(err);
                this.errorMessage = message;
                this.status = "error";
                ui.show(message, "error");
            }
        }
    }

    async retry() {
        const target = this.#target;
        if (!target) return;

        this.#engine.stop();
        this.status = "idle";
        this.errorMessage = null;
        await this.start(target);
    }

    pause(): boolean {
        if (this.status !== "scanning") return false;
        if (!this.#engine.pause()) return false;

        this.status = "paused";
        return true;
    }

    async resume() {
        if (this.status !== "paused") return;

        try {
            const resumed = await this.#engine.resume();
            if (resumed) {
                this.status = "scanning";
                return;
            }

            if (this.status === "paused" && this.#target) {
                const target = this.#target;
                this.#engine.stop();
                this.status = "idle";
                await this.start(target);
            }
        } catch (err: unknown) {
            if (this.status === "paused") {
                const message = this.#getCameraErrorMessage(err);
                this.errorMessage = message;
                this.status = "error";
                ui.show(message, "error");
            }
        }
    }

    stop() {
        this.#engine.stop();
        this.#target = null;
        this.status = "idle";
        this.errorMessage = null;
        this.isProcessing = false;
    }

    setTorch(enabled: boolean) {
        return this.#engine.setTorch(enabled);
    }

    async lookupCode(rawCode: string) {
        const code = rawCode.trim();
        if (!code || this.isProcessing) return;

        await this.#handleCode(code);
    }

    async processImage(file: File | null) {
        if (this.isProcessing || !file) return;

        logger.log("[scanner] process image: " + file.name);
        this.isProcessing = true;

        try {
            let code: string | null = null;

            try {
                code = await this.#engine.decodeImage(file);
            } catch (error) {
                logger.error("[scanner] image decode failed", error);
                ui.show(m.toast_image_decode_failed(), "error");
                return;
            }

            if (!code) {
                ui.show(m.toast_no_barcode_detected(), "warning");
                return;
            }

            await this.#lookupAndNavigate(code);
        } finally {
            this.isProcessing = false;
        }
    }

    async #handleCode(code: string) {
        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            await this.#lookupAndNavigate(code);
        } finally {
            this.isProcessing = false;
        }
    }

    async #lookupAndNavigate(code: string) {
        const result = await this.#service.lookup(code);

        switch (result.type) {
            case "found":
                ui.show(
                    result.fromCache
                        ? m.toast_loaded_from_history()
                        : m.toast_product_found(),
                    "success",
                );
                await goto(resolve(`/history/${result.code}`));
                break;

            case "not_found":
                ui.show(
                    m.toast_product_not_found_code({ code: result.code }),
                    "warning",
                );
                break;

            case "rate_limited":
                ui.show(
                    m.toast_rate_limited_wait(),
                    "warning",
                );
                break;

            case "blacklisted":
                ui.show(
                    m.toast_blacklisted_short(),
                    "warning",
                );
                break;

            case "error":
                ui.show(result.message, "error");
                break;
        }
    }

    #getCameraErrorMessage(error: unknown): string {
        const err = error as { name?: string; message?: string } | null;

        if (err?.name === "NotAllowedError") return m.toast_camera_denied();
        if (err?.name === "NotFoundError") return m.toast_camera_not_found();
        if (err?.name === "NotReadableError") return m.toast_camera_in_use();
        if (err?.name === "NotSupportedError" && err.message) return err.message;
        return m.toast_camera_error();
    }
}

export const Scanner = new ScannerController();
