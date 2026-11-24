export type NutriScoreGrade =
    "a" | "b" | "c" | "d" | "e" | "unknown";

/** Eco-Score letters as published by Open Food Facts, from the top A+ grade to F. */
export type EcoScoreGrade = "a-plus" | "a" | "b" | "c" | "d" | "e" | "f";

export type NutrientLevel = "low" | "moderate" | "high";

export type TrackedNutrientId = "sugars" | "salt" | "saturated-fat" | "fat";

export type NutrientMeasurement = {
    value: number;
    unit: string;
};

/** API-version-agnostic per-100g/100ml nutrition summary consumed by ProductAnalysis. */
export type ProductNutrition = {
    energyKcal?: number;
} & Partial<Record<TrackedNutrientId, NutrientMeasurement>>;

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
        nutrition?: ProductNutrition;
        /** Legacy raw v2 nutriments map kept optional so previously cached IndexedDB rows still render. */
        nutriments?: Record<string, number | string>;
    };
}
