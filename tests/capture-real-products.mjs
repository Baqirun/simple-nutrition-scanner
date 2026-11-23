#!/usr/bin/env bun
/**
 * Captures real Open Food Facts v2 `product` responses into tests/fixtures/real/
 * so analysis and parsing tests can run offline against genuine payloads.
 *
 * The catalog (tests/fixtures/real/catalog.json) names the barcode, the file to
 * write and the data gap the fixture is meant to exercise. Raw response bodies
 * are stored byte-for-byte; manifest.json is a human-readable digest.
 *
 * Usage
 *   bun tests/capture-real-products.mjs                     # fetch catalog entries that have no file yet
 *   bun tests/capture-real-products.mjs --refresh           # refetch every catalog entry
 *   bun tests/capture-real-products.mjs --only=3017620422003,20724696
 *   bun tests/capture-real-products.mjs --search='nutrition_grades=unknown&page_size=20'
 *   bun tests/capture-real-products.mjs --search='...' --search='...'   # searches are spaced too
 *
 * Open Food Facts asks read clients to stay well below 10 requests per minute,
 * so every network call, search included, waits 6.5s after the previous one.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, "fixtures", "real");
const CATALOG = path.join(DIR, "catalog.json");
const MANIFEST = path.join(DIR, "manifest.json");
const ADDITIVES = path.join(HERE, "..", "src", "lib", "data", "additives-min.json");

const API = "https://world.openfoodfacts.org/api/v2";
const USER_AGENT = "Simple-Nutrition-Scanner/1.3.0 APP_ID=capture-products (veteran_lively047@aleeas.com)";
const DEFAULT_INTERVAL_MS = 6_500;
const SEARCH_FIELDS = [
    "code",
    "product_name",
    "generic_name",
    "brands",
    "nutriscore_grade",
    "nova_group",
    "ecoscore_grade",
    "nutrient_levels",
    "nutriments",
    "additives_tags",
    "labels_tags",
    "image_front_url",
    "image_url",
    "ingredients_text",
    "ingredients_text_en",
    "countries_tags",
    "categories_tags"
].join(",");

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const option = name => {
    const prefix = `--${name}=`;
    const hit = args.find(arg => arg.startsWith(prefix));
    return hit ? hit.slice(prefix.length) : undefined;
};
const collect = name => {
    const prefix = `--${name}=`;
    return args.filter(arg => arg.startsWith(prefix)).map(arg => arg.slice(prefix.length));
};

const interval = Number(option("interval") ?? DEFAULT_INTERVAL_MS);
const searches = collect("search");
const only = option("only")?.split(",").map(code => code.trim()).filter(Boolean);
const refresh = flag("refresh");

let lastRequest = 0;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function pace() {
    const wait = lastRequest + interval - Date.now();
    if (wait > 0) {
        console.log(`  ... waiting ${Math.ceil(wait / 1000)}s to stay under 10 requests/minute`);
        await sleep(wait);
    }
    lastRequest = Date.now();
}

async function request(url, attempt = 1) {
    await pace();
    const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        cache: "no-store"
    });

    // 429 is per-client and 503 is the global endpoint limit. Both mean stop
    // asking for a while, not that the fixture is broken.
    if ((res.status === 429 || res.status === 503) && attempt <= 3) {
        const pause = res.status === 429 ? 90_000 : 65_000;
        console.log(`  ${res.status} from Open Food Facts; backing off ${pause / 1000}s (attempt ${attempt}/3)`);
        await sleep(pause);
        lastRequest = Date.now();
        return request(url, attempt + 1);
    }

    if (!res.ok && res.status !== 404) {
        throw new Error(`HTTP ${res.status} for ${url}`);
    }

    console.log(`  ${res.status} ${url.replace("https://world.openfoodfacts.org", "")}`);
    return res;
}

const riskDatabase = JSON.parse(await readFile(ADDITIVES, "utf8"));
const riskOf = tag => riskDatabase[tag]?.r ?? 0;

const NUTRIENT_IDS = ["sugars", "salt", "sodium", "fat", "saturated-fat", "energy-kcal", "energy-kj", "energy"];

function nutrientShape(nutriments) {
    return NUTRIENT_IDS.flatMap(id => {
        const keys = Object.keys(nutriments)
            .filter(key => key === id || key.startsWith(`${id}_`))
            .sort();
        if (keys.length === 0) return [];
        const variants = keys.map(key => key.slice(id.length + 1) || "bare");
        return [`${id}{${variants.join(",")}}`];
    }).join(" ");
}

function summarise(body) {
    const product = body?.product;
    if (!product) {
        return { found: false, status: body?.status ?? null, verbose: body?.status_verbose ?? null };
    }

    const nutriments = product.nutriments ?? {};
    const additives = product.additives_tags ?? [];

    return {
        found: true,
        name: product.product_name ?? "",
        brands: product.brands ?? "",
        grade: product.nutriscore_grade ?? null,
        nova: product.nova_group ?? null,
        ecoscore: product.ecoscore_grade ?? null,
        nutrientLevels: Object.fromEntries(Object.entries(product.nutrient_levels ?? {})),
        nutrientShape: nutrientShape(nutriments),
        additives: additives.map(tag => `${tag}:${riskOf(tag)}`),
        organic: (product.labels_tags ?? []).some(label => label.includes("organic")),
        image: Boolean(product.image_front_url || product.image_url),
        ingredients: Boolean(product.ingredients_text_en || product.ingredients_text),
        prepared: Object.keys(nutriments).some(key => key.includes("prepared")),
        stringValues: Object.entries(nutriments)
            .filter(([, value]) => typeof value === "string" && value !== "")
            .map(([key]) => key)
    };
}

function line(code, httpStatus, summary) {
    if (!summary.found) {
        return `[${httpStatus}] ${code} NOT FOUND (${summary.verbose ?? "no body"})`;
    }

    const levels = Object.entries(summary.nutrientLevels)
        .map(([key, value]) => `${key}:${value}`)
        .join(",");

    return [
        `[${httpStatus}] ${code}`,
        summary.name.slice(0, 38).padEnd(38),
        `grade=${summary.grade ?? "-"}`,
        `nova=${summary.nova ?? "-"}`,
        `eco=${summary.ecoscore ?? "-"}`,
        `add=${summary.additives.length}`,
        `org=${summary.organic ? "y" : "n"}`,
        `img=${summary.image ? "y" : "n"}`,
        `ing=${summary.ingredients ? "y" : "n"}`,
        summary.prepared ? "prepared" : "",
        levels ? `levels=${levels}` : "levels=-",
        `nut=${summary.nutrientShape || "-"}`
    ].filter(Boolean).join("  ");
}

await mkdir(DIR, { recursive: true });

for (const query of searches) {
    console.log(`\nsearch: ${query}`);
    const res = await request(`${API}/search?${query}&fields=${SEARCH_FIELDS}`);
    const body = await res.json();
    const products = body.products ?? [];

    console.log(`${products.length} of ${body.count ?? "?"} products`);
    for (const product of products) {
        const summary = summarise({ product });
        console.log(line(product.code, 200, summary));
        if (summary.stringValues?.length) {
            console.log(`           string values: ${summary.stringValues.join(",")}`);
        }
    }
}

if (searches.length === 0) {
    const catalog = JSON.parse(await readFile(CATALOG, "utf8"));
    const manifestPath = MANIFEST;

    // Kept so a run that only fills gaps can still rebuild the manifest from
    // the files already on disk, including their HTTP status.
    let previous = { products: [] };
    if (existsSync(MANIFEST)) {
        try {
            previous = JSON.parse(await readFile(MANIFEST, "utf8"));
        } catch {
            previous = { products: [] };
        }
    }
    const priorByCode = new Map((previous.products ?? []).map(entry => [entry.code, entry]));
    let fetched = false;

    for (const entry of catalog.products) {
        if (only && !only.includes(entry.code)) continue;

        const file = path.join(DIR, entry.file);
        if (!refresh && existsSync(file)) {
            const text = await readFile(file, "utf8");
            let cachedBody;
            try {
                cachedBody = JSON.parse(text);
            } catch {
                cachedBody = undefined;
            }

            entry.httpStatus = priorByCode.get(entry.code)?.httpStatus ?? (cachedBody?.product ? 200 : null);
            entry.summary = summarise(cachedBody);
            console.log(`= ${entry.code} already captured (${entry.file})`);
            continue;
        }

        console.log(`\nfetch: ${entry.code} (${entry.scenario})`);
        const res = await request(`${API}/product/${entry.code}.json`);
        const text = await res.text();
        console.log(`  ${text.length} bytes`);

        await writeFile(file, text, "utf8");

        let body;
        try {
            body = JSON.parse(text);
        } catch {
            body = undefined;
        }

        entry.httpStatus = res.status;
        entry.summary = summarise(body);
        console.log(line(entry.code, res.status, entry.summary));
        if (entry.summary.stringValues?.length) {
            console.log(`  string values: ${entry.summary.stringValues.join(",")}`);
        }

        fetched = true;
    }

    if (fetched || !previous.capturedAt) {
        catalog.capturedAt = new Date().toISOString().slice(0, 10);
    } else {
        catalog.capturedAt = previous.capturedAt;
    }

    await writeFile(manifestPath, `${JSON.stringify(catalog, null, 4)}\n`, "utf8");
    console.log(`\nmanifest written to ${path.relative(HERE, manifestPath)}`);
}
