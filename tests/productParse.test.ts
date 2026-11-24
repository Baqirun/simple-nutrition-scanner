import { describe, expect, it } from "vitest";
import { parseProductPayload } from "$lib/services/api/productParse";
import { envelope, notFound, nutella, organicAlmonds } from "./fixtures";

describe("parseProductPayload", () => {
    it("reads a real Open Food Facts envelope", () => {
        const result = parseProductPayload(nutella);

        expect(result.type).toBe("product");
        if (result.type !== "product") return;

        expect(result.product.code).toBe("3017620422003");
        expect(result.product.product.product_name).toBe("Nutella");
        expect(result.product.product.brands).toBe("Nutella, Ferrero");
        expect(result.product.product.nutriscore_grade).toBe("e");
        expect(result.product.product.nova_group).toBe(4);
        expect(result.product.product.additives_tags).toEqual(["en:e322", "en:e322i"]);
        expect(result.product.product.nutrient_levels).toEqual({
            fat: "high",
            salt: "low",
            "saturated-fat": "high",
            sugars: "high"
        });
    });

    it("keeps only the fields the app stores and defaults missing lists", () => {
        const result = parseProductPayload(nutella);

        expect(result.type).toBe("product");
        if (result.type !== "product") return;

        expect(Object.keys(result.product).sort()).toEqual(["code", "product"]);
        expect(result.product.product.nutrition?.sugars).toEqual({ value: 56.3, unit: "g" });
        expect(result.product.product.nutrition?.energyKcal).toBe(539);
        expect(result.product.product.nutriments).toBeUndefined();
    });

    it("always stores grams for per-100g nutrients even when the raw unit is mg", () => {
        const result = parseProductPayload(
            envelope({ nutriments: { salt_100g: 0.5, salt_value: 500, salt_unit: "mg" } })
        );

        expect(result.type).toBe("product");
        if (result.type !== "product") return;

        expect(result.product.product.nutrition?.salt).toEqual({ value: 0.5, unit: "g" });
    });

    it("normalises an upper-case grade and a numeric code", () => {
        const result = parseProductPayload(envelope({ code: 3017620422003, nutriscore_grade: "B" }));

        expect(result.type).toBe("product");
        if (result.type !== "product") return;

        expect(result.product.code).toBe("3017620422003");
        expect(result.product.product.nutriscore_grade).toBe("b");
    });

    it("treats a v2 not-found envelope as not_found", () => {
        expect(parseProductPayload(notFound)).toEqual({ type: "invalid", reason: "not_found" });
    });

    it("treats a found status without a product body as not_found", () => {
        expect(parseProductPayload({ status: 1 })).toEqual({ type: "invalid", reason: "not_found" });
    });

    it("rejects a product that carries no usable code", () => {
        const result = parseProductPayload({ status: 1, code: "   ", product: { product_name: "Nameless" } });

        expect(result).toEqual({ type: "invalid", reason: "malformed" });
    });

    it.each([[null], [undefined], ["nope"], [42], [[]]])("rejects the non-envelope payload %s", payload => {
        expect(parseProductPayload(payload)).toEqual({ type: "invalid", reason: "malformed" });
    });

    it("keeps an empty additives list for a clean product", () => {
        const result = parseProductPayload(organicAlmonds);

        expect(result.type).toBe("product");
        if (result.type !== "product") return;

        expect(result.product.product.additives_tags).toEqual([]);
        expect(result.product.product.nutriscore_grade).toBe("a");
    });

    it("keeps a real Eco-Score letter", () => {
        const result = parseProductPayload(organicAlmonds);

        expect(result.type).toBe("product");
        if (result.type !== "product") return;

        expect(result.product.product.ecoscore_grade).toBe("d");
    });

    it.each([["unknown"], ["not-applicable"], [""], [undefined]])(
        "drops the non-grade Eco-Score %s",
        value => {
            const result = parseProductPayload(envelope({ ecoscore_grade: value }));

            expect(result.type).toBe("product");
            if (result.type !== "product") return;

            expect(result.product.product.ecoscore_grade).toBeUndefined();
        }
    );

    it("normalises an upper-case Eco-Score", () => {
        const result = parseProductPayload(envelope({ ecoscore_grade: " B " }));

        expect(result.type).toBe("product");
        if (result.type !== "product") return;

        expect(result.product.product.ecoscore_grade).toBe("b");
    });

    it.each<[string, string]>([["f", "f"], ["a-plus", "a-plus"], ["a+", "a-plus"], [" A-PLUS ", "a-plus"]])(
        "keeps the real Green-Score vocabulary value %s",
        (value, expected) => {
            const result = parseProductPayload(envelope({ ecoscore_grade: value }));

            expect(result.type).toBe("product");
            if (result.type !== "product") return;

            expect(result.product.product.ecoscore_grade).toBe(expected);
        }
    );

    it.each([["not-applicable"], ["unknown"], [""], [undefined]])(
        "normalises the non-grade Nutri-Score %s to unknown",
        value => {
            const result = parseProductPayload(envelope({ nutriscore_grade: value }));

            expect(result.type).toBe("product");
            if (result.type !== "product") return;

            expect(result.product.product.nutriscore_grade).toBe("unknown");
        }
    );
});
