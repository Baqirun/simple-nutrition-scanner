import * as m from "$lib/paraglide/messages";
import type { ProductAnalysis, Rating, ScoreReason } from "$lib/models/productAnalysis";
import type { EcoScoreGrade, NutrientLevel } from "$lib/types/product";

export function localizedRatingLabel(rating: Rating): string {
    switch (rating.grade) {
        case "A":
            return m.rating_excellent();
        case "B":
            return m.rating_good();
        case "C":
            return m.rating_mediocre();
        case "D":
            return m.rating_poor();
        case "E":
            return m.rating_very_poor();
        default:
            return m.rating_not_rated();
    }
}

export function localizedScoreReason(reason: ScoreReason, analysis: ProductAnalysis): string {
    if (!analysis.isRated) return m.reason_no_nutrition();

    switch (reason.id) {
        case "nutrition": {
            const grade = analysis.nutriscoreGrade.toUpperCase();
            return reason.label.startsWith("Nutrition")
                ? m.reason_nutrition_nutriscore({ grade })
                : m.reason_nutriscore({ grade });
        }
        case "additives":
            return m.reason_additives();
        case "organic":
            return m.reason_organic();
        case "hazard-cap":
            return m.reason_hazard_cap();
    }
}

export function localizedNutrientLabel(id: string): string {
    switch (id) {
        case "sugars":
            return m.nutrient_sugars();
        case "salt":
            return m.nutrient_salt();
        case "saturated-fat":
            return m.nutrient_saturated_fat();
        case "fat":
            return m.nutrient_fat();
        default:
            return id;
    }
}

export function localizedNutrientLevel(level: NutrientLevel): string {
    switch (level) {
        case "low":
            return m.nutrient_level_low();
        case "moderate":
            return m.nutrient_level_moderate();
        case "high":
            return m.nutrient_level_high();
    }
}

export function localizedNovaLabel(group: number): string {
    switch (group) {
        case 1:
            return m.details_nova_1();
        case 2:
            return m.details_nova_2();
        case 3:
            return m.details_nova_3();
        case 4:
            return m.details_nova_4();
        default:
            return m.details_unknown();
    }
}

export function localizedEcoLabel(grade: EcoScoreGrade): string {
    switch (grade) {
        case "a-plus":
        case "a":
            return m.details_eco_very_low();
        case "b":
            return m.details_eco_low();
        case "c":
            return m.details_eco_moderate();
        case "d":
            return m.details_eco_high();
        case "e":
        case "f":
            return m.details_eco_very_high();
    }
}

export function localizedProductName(analysis: ProductAnalysis): string {
    return analysis.name === "Unknown product" ? m.product_unknown_name() : analysis.name;
}

export function localizedProductBrands(analysis: ProductAnalysis): string {
    return analysis.brands === "Unknown Brand" ? m.product_unknown_brand() : analysis.brands;
}
