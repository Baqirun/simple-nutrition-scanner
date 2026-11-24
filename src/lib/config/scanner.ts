import type { ReaderOptions } from "zxing-wasm/reader";

export const cameraConstraints: MediaStreamConstraints = {
    audio: false,
    video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 960 },
    },
};

export const CAMERA_MAX_FRAME_SIZE = 1280;

export const liveReaderOptions: ReaderOptions = {
    formats: ["EANUPC"],
    maxNumberOfSymbols: 1,
    tryHarder: false,
    textMode: "Plain",
    eanAddOnSymbol: "Ignore",
};

export const imageReaderOptions: ReaderOptions = {
    formats: ["EANUPC"],
    maxNumberOfSymbols: 1,
    tryHarder: true,
    textMode: "Plain",
    eanAddOnSymbol: "Ignore",
};
