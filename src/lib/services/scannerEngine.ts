import {
    prepareZXingModule,
    readBarcodes,
} from "zxing-wasm/reader";
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import {
    CAMERA_MAX_FRAME_SIZE,
    cameraConstraints,
    imageReaderOptions,
    liveReaderOptions,
} from "$lib/config/scanner";
import { logger } from "$lib/ui/logger.svelte";

type FrameVideo = HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: () => void) => number;
    cancelVideoFrameCallback?: (handle: number) => void;
};

let wasmReady: Promise<unknown> | undefined;

function ensureWasm() {
    wasmReady ??= prepareZXingModule({
        fireImmediately: true,
        overrides: {
            locateFile: (path, prefix) =>
                path.endsWith(".wasm") ? wasmUrl : prefix + path,
        },
    }).catch((error) => {
        wasmReady = undefined;
        throw error;
    });

    return wasmReady;
}

export class ScannerEngine {
    #stream: MediaStream | null = null;
    #video: FrameVideo | null = null;
    #canvas: HTMLCanvasElement | null = null;
    #onDetected: ((code: string) => void) | null = null;
    #cancelFrame: (() => void) | null = null;
    #running = false;
    #paused = false;
    #inFlight = false;
    #lastFrameTime = -1;
    #generation = 0;

    async start(
        target: HTMLElement,
        onDetected: (code: string) => void,
    ): Promise<boolean> {
        if (this.#running) return true;

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new DOMException(
                "Camera access needs HTTPS or localhost",
                "NotSupportedError",
            );
        }

        const generation = ++this.#generation;

        await ensureWasm();
        if (generation !== this.#generation) return false;

        const stream = await navigator.mediaDevices.getUserMedia(
            cameraConstraints,
        );

        if (generation !== this.#generation) {
            stream.getTracks().forEach((track) => track.stop());
            return false;
        }

        this.#stream = stream;
        this.#onDetected = onDetected;
        this.#running = true;
        this.#paused = false;

        const video = document.createElement("video") as FrameVideo;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.setAttribute("aria-label", "Live camera preview");
        video.srcObject = stream;
        target.appendChild(video);
        this.#video = video;

        try {
            await video.play();
        } catch (error) {
            if (generation !== this.#generation) return false;
            this.stop();
            throw error;
        }

        if (generation !== this.#generation) return false;

        this.#canvas = document.createElement("canvas");
        this.#scheduleFrame();
        return true;
    }

    pause(): boolean {
        if (!this.#running || this.#paused) return false;

        this.#paused = true;
        this.#cancelFrame?.();
        this.#cancelFrame = null;
        this.#video?.pause();
        return true;
    }

    async resume(): Promise<boolean> {
        if (!this.#running || !this.#paused) return false;

        const video = this.#video;
        const track = this.#stream?.getVideoTracks()[0];
        if (!video || !track || track.readyState !== "live") {
            return false;
        }

        const generation = this.#generation;
        this.#paused = false;

        try {
            await video.play();
        } catch (error) {
            if (generation !== this.#generation) return false;
            this.#paused = true;
            throw error;
        }

        if (generation !== this.#generation || !this.#running || this.#paused) {
            return false;
        }

        this.#scheduleFrame();
        return true;
    }

    stop() {
        this.#generation++;
        this.#running = false;
        this.#paused = false;
        this.#cancelFrame?.();
        this.#cancelFrame = null;

        const video = this.#video;
        if (video) {
            video.pause();
            video.srcObject = null;
            video.remove();
        }

        this.#video = null;
        this.#canvas = null;
        this.#onDetected = null;

        this.#stream?.getTracks().forEach((track) => track.stop());
        this.#stream = null;

        this.#inFlight = false;
        this.#lastFrameTime = -1;
    }

    async setTorch(enabled: boolean) {
        const track = this.#stream?.getVideoTracks()[0];
        if (!track) throw new Error("No active camera track");

        await track.applyConstraints({
            advanced: [{ torch: enabled }],
        } as unknown as MediaTrackConstraints);
    }

    async decodeImage(file: File): Promise<string | null> {
        await ensureWasm();

        const results = await readBarcodes(file, imageReaderOptions);
        const result = results.find((entry) => entry.isValid && entry.text);

        return result?.text ?? null;
    }

    #scheduleFrame() {
        const video = this.#video;
        if (!video || !this.#running || this.#paused) return;

        const tick = () => {
            if (!this.#running || this.#paused) return;

            this.#scheduleFrame();

            if (!this.#inFlight) {
                this.#inFlight = true;
                void this.#decodeFrame().finally(() => {
                    this.#inFlight = false;
                });
            }
        };

        if (typeof video.requestVideoFrameCallback === "function") {
            const handle = video.requestVideoFrameCallback(tick);
            this.#cancelFrame = () =>
                video.cancelVideoFrameCallback?.(handle);
        } else {
            const handle = requestAnimationFrame(tick);
            this.#cancelFrame = () => cancelAnimationFrame(handle);
        }
    }

    async #decodeFrame() {
        const video = this.#video;
        const canvas = this.#canvas;
        if (!video || !canvas || !this.#running || this.#paused) return;
        if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
            return;
        }
        if (video.currentTime === this.#lastFrameTime) return;

        this.#lastFrameTime = video.currentTime;

        const scale = Math.min(
            1,
            CAMERA_MAX_FRAME_SIZE / Math.max(video.videoWidth, video.videoHeight),
        );
        const width = Math.max(1, Math.round(video.videoWidth * scale));
        const height = Math.max(1, Math.round(video.videoHeight * scale));

        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;

        context.drawImage(video, 0, 0, width, height);

        try {
            const results = await readBarcodes(
                context.getImageData(0, 0, width, height),
                liveReaderOptions,
            );

            if (!this.#running || this.#paused) return;

            const result = results.find(
                (entry) => entry.isValid && entry.text,
            );
            if (result) this.#onDetected?.(result.text);
        } catch (error) {
            logger.error("[scanner] frame decode failed", error);
        }
    }
}
