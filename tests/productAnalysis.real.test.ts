import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ProductAnalysis } from "$lib/models/productAnalysis";
import { parseProductPayload } from "$lib/services/api/productParse";
import type { Product } from "$lib/types/product";

/**
 * Runs every fixture in tests/fixtures/real/ through the real parser and
 * analyser. Catalog scenarios decide which payloads exist; this suite proves
 * none of them crash, contradict the score contract, or render a broken row.
 * The catalog is the source of truth, the generated manifest is not read.
 */
const DIR = fileURLToPath(new URL("./fixtures/real/", import.meta.url));

type CatalogEntry = {
    code: string;
    file: string;
    scenario: string;
    why: string;
};

type Fixture = {
    entry: CatalogEntry;
    product: Product;
};

const catalog = JSON.parse(readFileSync(`${DIR}catalog.json`, "utf8")) as { products: CatalogEntry[] };

function load(entry: CatalogEntry): Fixture {
    const raw = JSON.parse(readFileSync(`${DIR}${entry.file}`, "utf8"));
    const parsed = parseProductPayload(raw);

    if (parsed.type !== "product") {
        throw new Error(`${entry.file} (${entry.scenario}) did not parse: ${parsed.reason}`);
    }

    return { entry, product: parsed.product };
}

const fixtures = catalog.products.map(load);
const scenarios = new Set(fixtures.map(fixture => fixture.entry.scenario));

const GRADES = ["A", "B", "C", "D", "E", "?"];
const LEVELS = ["low", "moderate", "high", "unknown"];

describe("real product fixtures", () => {
    it("has more than one fixture, so invariants are not proven on a single shape", () => {
        expect(fixtures.length).toBeGreaterThan(3);
    });

    it("gives every fixture a unique scenario name", () => {
        expect(scenarios.size).toBe(fixtures.length);
    });

    describe.each(fixtures.map(({ entry, product }) => [entry.code, entry.scenario, product] as const))(
        "%s (%s)",
        (code, scenario, product) => {
            it("keeps the analysed product name and brand readable", () => {
                const analysis = new ProductAnalysis(product, { useCustomScore: "nutriscore" });

                expect(analysis.name.length).toBeGreaterThan(0);
                expect(analysis.brands.length).toBeGreaterThan(0);
                expect(analysis.exists).toBe(true);
            });

            it.each(["nutriscore", "app"] as const)("keeps the %s score inside 0..100", mode => {
                const analysis = new ProductAnalysis(product, { useCustomScore: mode });

                expect(analysis.score).toBeGreaterThanOrEqual(0);
                expect(analysis.score).toBeLessThanOrEqual(100);
                expect(GRADES).toContain(analysis.rating.grade);
            });

            it("adds up the app score from its published reasons", () => {
                const analysis = new ProductAnalysis(product, { useCustomScore: "app" });
                const total = analysis.scoreReasons.reduce((sum, reason) => sum + reason.points, 0);

                expect(total).toBe(analysis.score);
            });

            it("always renders the four nutrient rows, with a value or a question mark", () => {
                const analysis = new ProductAnalysis(product, { useCustomScore: "nutriscore" });

                expect(analysis.nutrients.map(row => row.id)).toEqual(["sugars", "salt", "saturated-fat", "fat"]);

                for (const row of analysis.nutrients) {
                    expect(row.value === "?" || /^\d+\.\d$/.test(row.value)).toBe(true);
                    expect(row.unit.length).toBeGreaterThan(0);
                    expect(LEVELS).toContain(row.level);
                    expect(row.color.length).toBeGreaterThan(0);
                }
            });

            it("reports calories in kcal, available only when an energy value exists", () => {
                const analysis = new ProductAnalysis(product, { useCustomScore: "nutriscore" });

                expect(analysis.calories.unit).toBe("kcal");
                expect(Number.isInteger(analysis.calories.value)).toBe(true);
                expect(analysis.calories.value).toBeGreaterThanOrEqual(0);
            });

            it("never throws on a stored additive tag", () => {
                const analysis = new ProductAnalysis(product, { useCustomScore: "app" });

                for (const additive of analysis.additives) {
                    expect(additive.tag.length).toBeGreaterThan(0);
                    expect([0, 1, 2, 3]).toContain(additive.risk);
                    expect(analysis.riskOf(additive.tag)).toBe(additive.risk);
                }
            });

            it("keeps code and scenario traceable to the catalog", () => {
                expect(product.code.length).toBeGreaterThan(0);
                expect(scenario.length).toBeGreaterThan(0);
                expect(code).toBe(product.code);
            });
        }
    );
});

/**
 * The assertions below are deliberately specific: they pin the current
 * behaviour on payloads the API really served, so a parser or scoring change
 * has to be a conscious decision rather than a silent drift.
 */
const byCode = new Map(fixtures.map(fixture => [fixture.entry.code, fixture]));

function productOf(code: string): Product {
    const fixture = byCode.get(code);
    if (!fixture) throw new Error(`No captured fixture for ${code}`);
    return fixture.product;
}

function rawProductOf(code: string): Record<string, unknown> {
    const fixture = byCode.get(code);
    if (!fixture) throw new Error(`No captured fixture for ${code}`);
    const raw = JSON.parse(readFileSync(`${DIR}${fixture.entry.file}`, "utf8"));
    return raw.product as Record<string, unknown>;
}

function analysisOf(code: string, mode: "nutriscore" | "app") {
    return new ProductAnalysis(productOf(code), { useCustomScore: mode });
}

function rowOf(code: string, id: string) {
    const row = analysisOf(code, "nutriscore").nutrients.find(nutrient => nutrient.id === id);
    if (!row) throw new Error(`No nutrient row ${id} for ${code}`);
    return row;
}

describe("captured payload scenarios", () => {
    it("stores only successful v2 envelopes, never a not-found body", () => {
        for (const { entry } of fixtures) {
            const raw = JSON.parse(readFileSync(`${DIR}${entry.file}`, "utf8"));
            expect(raw.status, entry.file).toBe(1);
            expect(typeof raw.product, entry.file).toBe("object");
        }
    });

    it("keeps accented and non-Latin product names intact through the fixture round trip", () => {
        expect(analysisOf("20724696", "nutriscore").name).toBe("Amandes décortiquées");
        expect(analysisOf("6111035002175", "nutriscore").name).toBe("Eau minérale naturelle");
        expect(analysisOf("6111252421568", "nutriscore").name).toBe("اكوافينا");
        expect(analysisOf("6111250470209", "nutriscore").name).toBe("VIP Gold café instantané");
    });

    it("reads the full Nutella payload end to end", () => {
        const analysis = analysisOf("3017620422003", "nutriscore");

        expect(analysis.nutriscoreGrade).toBe("e");
        expect(analysis.novaGroup).toBe(3);
        expect(analysis.nutrients.map(row => row.value)).toEqual(["56.3", "0.1", "10.6", "30.9"]);
        expect(analysis.calories).toEqual({ value: 539, unit: "kcal", available: true });
        expect(analysis.score).toBe(10);
        expect(analysis.rating.grade).toBe("E");
        expect(analysis.additives).toEqual([]);
    });

    it("scores a clean grade-a product without an organic label", () => {
        const analysis = analysisOf("20724696", "nutriscore");

        expect(analysis.isOrganic).toBe(false);
        expect(analysis.score).toBe(100);
        expect(analysisOf("20724696", "app").score).toBe(90);
        expect(productOf("20724696").product.ecoscore_grade).toBe("d");
    });

    it("reads a beverage with two additive risks", () => {
        const analysis = analysisOf("5449000000996", "app");

        expect(rowOf("5449000000996", "sugars")).toMatchObject({ value: "10.9", level: "high" });
        expect(rowOf("5449000000996", "salt")).toMatchObject({ value: "0.0", level: "low" });
        expect(analysis.calories.value).toBe(44);
        expect(analysis.additives.map(additive => [additive.tag, additive.risk])).toEqual([
            ["en:e150d", 1],
            ["en:e338", 2]
        ]);
        expect(analysis.score).toBe(2);
    });

    it("leaves missing nutrients blank instead of turning them into zero", () => {
        const analysis = analysisOf("6111242101180", "nutriscore");

        expect(analysis.nutriscoreGrade).toBe("unknown");
        expect(analysis.nutrients.map(row => row.value)).toEqual(["?", "?", "?", "3.0"]);
        expect(analysis.nutrients[2].level).toBe("moderate");
        expect(analysis.calories).toEqual({ value: 58, unit: "kcal", available: true });
        expect(analysis.score).toBe(0);
        expect(analysis.rating.grade).toBe("?");
    });

    it("keeps published nutrient levels even when every value is missing", () => {
        const analysis = analysisOf("6111035002175", "nutriscore");

        expect(analysis.nutrients.map(row => row.value)).toEqual(["?", "?", "?", "?"]);
        expect(analysis.nutrients.map(row => row.level)).toEqual(["low", "low", "low", "low"]);
        expect(analysis.calories.available).toBe(false);
        expect(analysis.score).toBe(100);
    });

    it("keeps nova undefined when the payload omits it", () => {
        expect(analysisOf("6111252421568", "nutriscore").novaGroup).toBeUndefined();
    });

    it("treats a real zero reading as available data, not as missing", () => {
        const analysis = analysisOf("6111252421568", "nutriscore");

        expect(analysis.nutrients.map(row => row.value)).toEqual(["0.0", "0.0", "0.0", "0.0"]);
        expect(analysis.calories).toEqual({ value: 0, unit: "kcal", available: true });
    });

    it("awards the organic bonus on top of the nutrition points", () => {
        const analysis = analysisOf("3760049790214", "app");

        expect(analysis.isOrganic).toBe(true);
        expect(analysis.score).toBe(70);
        expect(analysis.scoreReasons.map(reason => [reason.id, reason.points])).toEqual([
            ["nutrition", 30],
            ["additives", 30],
            ["organic", 10]
        ]);
        expect(analysisOf("3760049790214", "nutriscore").rating.grade).toBe("C");
    });

    it("never lets a hazardous additive lift the additive budget", () => {
        const analysis = analysisOf("3095758049019", "app");

        expect(analysis.additives.map(additive => [additive.tag, additive.risk])).toEqual([
            ["en:e250", 3],
            ["en:e301", 0]
        ]);
        expect(analysis.riskOf("en:e250")).toBe(3);
        expect(analysis.score).toBe(30);
        expect(analysis.scoreReasons.find(reason => reason.id === "additives")?.points).toBe(0);
    });

    it("clamps the additive penalty at zero for a six-additive product", () => {
        const analysis = analysisOf("0811620022118", "app");

        expect(analysis.additives.map(additive => additive.risk)).toEqual([2, 0, 0, 2, 2, 2]);
        expect(analysis.score).toBe(0);
        expect(analysis.scoreReasons.find(reason => reason.id === "additives")?.points).toBe(0);
        expect(analysis.rating.grade).toBe("?");
    });

    it("maps a real 'not-applicable' grade to unknown without rewriting the stored value", () => {
        expect(productOf("0811620022118").product.nutriscore_grade as string).toBe("not-applicable");
        expect(analysisOf("0811620022118", "nutriscore").nutriscoreGrade).toBe("unknown");
        expect(analysisOf("0811620022118", "nutriscore").score).toBe(0);
    });

    it("falls back to placeholders when the product has no name or image", () => {
        const analysis = analysisOf("0182866962187", "nutriscore");

        expect(analysis.name).toBe("Unknown product");
        expect(analysis.brands).toBe("Unknown Brand");
        expect(analysis.imageUrl).toBeUndefined();
        expect(analysis.score).toBe(75);
    });

    it("falls back per nutrient level instead of dropping the whole map", () => {
        const analysis = analysisOf("0040600022651", "nutriscore");

        expect(rowOf("0040600022651", "sugars")).toMatchObject({ value: "30.0", level: "high" });
        expect(rowOf("0040600022651", "saturated-fat")).toMatchObject({ value: "24.0", level: "high" });
        expect(rowOf("0040600022651", "fat")).toMatchObject({ value: "41.0", level: "high" });
        expect(rowOf("0040600022651", "salt")).toMatchObject({ value: "?", level: "unknown" });
        expect(analysis.ingredientsText).toBeUndefined();
        expect(analysis.calories.value).toBe(566);
    });

    it("currently rejects the wider Eco-Score vocabulary the API really emits", () => {
        // The raw payloads are the evidence: 'f' and 'a-plus' are real values.
        expect(rawProductOf("3017620422003").ecoscore_grade).toBe("f");
        expect(rawProductOf("3760049790214").ecoscore_grade).toBe("a-plus");

        // ...but the a-e union in product.ts drops them, so nothing is displayed.
        expect(productOf("3017620422003").product.ecoscore_grade).toBeUndefined();
        expect(productOf("3760049790214").product.ecoscore_grade).toBeUndefined();
        expect(productOf("5449000000996").product.ecoscore_grade).toBeUndefined();
        expect(productOf("20724696").product.ecoscore_grade).toBe("d");
    });

    it("documents the current app score for a product with no nutrition data", () => {
        // No nutrition, no additives, unknown grade: the additive budget still
        // contributes its full 30 points, so the card reads "Very Poor".
        const analysis = analysisOf("6111250470209", "app");

        expect(analysis.nutrients.every(row => row.value === "?")).toBe(true);
        expect(analysis.calories.available).toBe(false);
        expect(analysis.score).toBe(30);
        expect(analysis.rating.grade).toBe("E");
    });
});
