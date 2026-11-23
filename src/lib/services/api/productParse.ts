import type { Product } from "$lib/types/product";

/**
 * Result of reading one Open Food Facts `/api/v2/product/{code}.json` body.
 * Every body that is not a usable product is reported as `invalid` with a reason,
 * so callers never have to guess why a scan produced nothing to store.
 */
export type ParseResult =
    | { type: "product"; product: Product }
    | { type: "invalid"; reason: "not_found" | "malformed" };

/** The subset of the v2 envelope this app relies on; anything else is dropped before storage. */
type OffEnvelope = {
    status?: number;
    code?: string;
    product?: {
        code?: string;
        product_name?: string;
        brands?: string;
        image_url?: string;
        image_front_url?: string;
        nutriscore_grade?: string;
        nutriscore_score?: number;
        nova_group?: number;
        ecoscore_grade?: string;
        ingredients_text_en?: string;
        ingredients_text?: string;
        additives_tags?: string[];
        labels_tags?: string[];
        nutrient_levels?: Product["product"]["nutrient_levels"];
        nutriments?: Record<string, number | string>;
    };
};

export function parseProductPayload(payload: unknown): ParseResult {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return { type: "invalid", reason: "malformed" };
    }

    const data = payload as OffEnvelope;

    if (data.status !== 1 || !data.product) {
        return { type: "invalid", reason: "not_found" };
    }

    const source = data.product;
    const code = normaliseCode(source.code ?? data.code);

    if (!code) {
        return { type: "invalid", reason: "malformed" };
    }

    const product: Product = {
        code,
        product: {
            product_name: source.product_name ?? "",
            brands: source.brands,
            image_url: source.image_url,
            image_front_url: source.image_front_url,
            nutriscore_grade: toNutriScoreGrade(source.nutriscore_grade),
            nutriscore_score: source.nutriscore_score,
            nova_group: source.nova_group,
            ecoscore_grade: toEcoScoreGrade(source.ecoscore_grade),
            ingredients_text_en: source.ingredients_text_en,
            ingredients_text: source.ingredients_text,
            additives_tags: source.additives_tags ?? [],
            labels_tags: source.labels_tags ?? [],
            nutrient_levels: source.nutrient_levels ?? {},
            nutriments: source.nutriments ?? {}
        }
    };

    return { type: "product", product };
}

function normaliseCode(value: unknown): string {
    if (typeof value !== "string" && typeof value !== "number") return "";
    return String(value).trim();
}

const NUTRI_SCORE_GRADES = ["a", "b", "c", "d", "e"] as const;

/**
 * Open Food Facts answers with `unknown`, `not-applicable` or an empty grade
 * for non-food products and incomplete entries. Only a real letter is a grade;
 * everything else is stored as `unknown` so the type matches the data.
 */
function toNutriScoreGrade(value: unknown): Product["product"]["nutriscore_grade"] {
    const grade = typeof value === "string" ? value.trim().toLowerCase() : "";
    return NUTRI_SCORE_GRADES.includes(grade as (typeof NUTRI_SCORE_GRADES)[number])
        ? (grade as Product["product"]["nutriscore_grade"])
        : "unknown";
}

const ECO_SCORE_GRADES = ["a-plus", "a", "b", "c", "d", "e", "f"] as const;

/**
 * Open Food Facts publishes the Green-Score from A+ to F: the v2 field can be
 * `a-plus` or `a+` for the top grade. `unknown`, `not-applicable` and empty
 * strings are not grades, so they are dropped rather than stored and rendered.
 */
function toEcoScoreGrade(value: unknown): Product["product"]["ecoscore_grade"] {
    if (typeof value !== "string") return undefined;

    const raw = value.trim().toLowerCase();
    const grade = raw === "a+" ? "a-plus" : raw;

    return ECO_SCORE_GRADES.includes(grade as (typeof ECO_SCORE_GRADES)[number])
        ? (grade as Product["product"]["ecoscore_grade"])
        : undefined;
}
