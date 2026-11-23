export type NutriScoreGrade =
    "a" | "b" | "c" | "d" | "e" | "unknown";

/** Eco-Score letters as published by Open Food Facts, from the top A+ grade to F. */
export type EcoScoreGrade = "a-plus" | "a" | "b" | "c" | "d" | "e" | "f";

export type NutrientLevel = "low" | "moderate" | "high";

/**
 * Which formula produces the displayed score. `"app"` is the additive-aware
 * App Analysis; `"nutriscore"` mirrors the published Nutri-Score grade.
 */
export type ScoreFunction = "nutriscore" | "app";

export type Product = {
    code: string;
    /** Epoch milliseconds of the first successful lookup; absent on rows stored before this field existed. */
    scannedAt?: number;
    product: {
        product_name: string;
        brands?: string;
        image_url?: string;
        image_front_url?: string;
        nutriscore_grade?: NutriScoreGrade;
        nutriscore_score?: number;
        nova_group?: number;
        ecoscore_grade?: EcoScoreGrade;
        ingredients_text_en?: string;
        ingredients_text?: string;
        additives_tags?: string[];
        labels_tags?: string[];
        nutrient_levels?: {
            fat?: NutrientLevel;
            salt?: NutrientLevel;
            "saturated-fat"?: NutrientLevel;
            sugars?: NutrientLevel;
        };
        nutriments: Record<string, number | string>;
    };
}
