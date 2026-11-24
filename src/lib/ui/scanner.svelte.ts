// lib/ui/scanner.svelte.ts
import { ScannerEngine } from "$lib/services/scannerEngine";
import { ProductService } from "$lib/services/productService";
import { ProductRepository } from "$lib/services/productRepository";
import { ui } from "./alert.svelte";
import { logger } from "./logger.svelte";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import * as m from "$lib/paraglide/messages";

class ScannerController {
    isActive = $state(false);
    isProcessing = $state(false);

    #engine = new ScannerEngine();
    #service = new ProductService({ repo: new ProductRepository() });

    async start(target: HTMLElement) {
        if (this.isActive) return;

        try {
            await this.#engine.start(target, (code) => {
                if (!this.isProcessing) {
                    this.#handleCode(code);
                }
            });

        } catch (err: any) {
            this.#handleCameraError(err);

        } finally {
            this.isActive = true;
        }
    }

    stop() {
        this.#engine.stop();
        this.isActive = false;
        this.isProcessing = false;
    }

    setTorch(enabled: boolean) {
        return this.#engine.setTorch(enabled);
    }

    async processImage(file: File | null) {
        if (this.isProcessing || !file) return;

        logger.log("[scanner] process image: " + file.name);

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

        await this.#handleCode(code);
    }

    async #handleCode(code: string) {
        if (this.isProcessing || !this.isActive) return;

        this.isProcessing = true;

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
                    this.isActive = false;
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
        } finally {
            this.isProcessing = false;
        }
    }

    #handleCameraError(error: any) {
        if (error?.name === "NotAllowedError")
            ui.show(m.toast_camera_denied(), "error");
        else if (error?.name === "NotFoundError")
            ui.show(m.toast_camera_not_found(), "error");
        else if (error?.name === "NotReadableError")
            ui.show(m.toast_camera_in_use(), "error");
        else if (error?.name === "NotSupportedError")
            ui.show(error.message, "error");
        else ui.show(m.toast_camera_error(), "error");
    }
}

export const Scanner = new ScannerController();
