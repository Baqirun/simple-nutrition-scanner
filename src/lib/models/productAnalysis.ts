import type { EcoScoreGrade, NutriScoreGrade, NutrientLevel, Product, ProductNutrition } from "$lib/types/product";
import { additives, type AdditiveImpact, type AdditiveInfo } from "$lib/services/additiveService";
import { extractV2Nutrition } from "$lib/services/api/productParse";
import { settings } from "$lib/core/settings.svelte";

export type ScoreFunction = "nutriscore" | "app";

export type ScoreOptions = { useCustomScore?: ScoreFunction };

export type Rating = {
    grade: string;
    label: string;
    color: string;
    hex: string;
};

/** One score contribution, so the UI can explain a rating instead of just showing it. */
export type ScoreReason = {
    id: "nutrition" | "additives" | "organic" | "hazard-cap";
    label: string;
    points: number;
};

export type NutrientRow = {
    id: string;
    label: string;
    icon: string;
    value: string | null;
    unit: string;
    level: NutrientLevel | undefined;
};

export type IngredientsInfo = {
    text: string;
    isEnglish: boolean;
};

export type CalorieInfo = {
    value: number;
    unit: string;
    available: boolean;
};

const NUTRI_POINTS: Record<NutriScoreGrade, number> = { a: 60, b: 45, c: 30, d: 15, e: 0, unknown: 0 };
const NUTRI_SCORE_UI: Record<NutriScoreGrade, number> = { a: 100, b: 75, c: 50, d: 25, e: 10, unknown: 0 };
/** The star rating for each published Nutri-Score letter. */
const RATING_BY_GRADE: Record<NutriScoreGrade, Rating> = {
    a: { grade: "A", label: "Excellent", color: "green-600", hex: "#16a34a" },
    b: { grade: "B", label: "Good", color: "green-500", hex: "#22c55e" },
    c: { grade: "C", label: "Mediocre", color: "yellow-500", hex: "#eab308" },
    d: { grade: "D", label: "Poor", color: "orange-500", hex: "#f97316" },
    e: { grade: "E", label: "Very Poor", color: "red-600", hex: "#dc2626" },
    unknown: { grade: "?", label: "Not rated", color: "gray-400", hex: "" }
};
const MAX_ADDITIVE_POINTS = 30;
const ORGANIC_BONUS = 10;
const HAZARD_CAP = 49;

const GRADES: readonly NutriScoreGrade[] = ["a", "b", "c", "d", "e", "unknown"];

const NUTRIENT_CONFIG = [
    { id: "sugars", label: "Sugar", icon: "🍭" },
    { id: "salt", label: "Salt", icon: "🧂" },
    { id: "saturated-fat", label: "Sat. Fat", icon: "🥓" },
    { id: "fat", label: "Fat", icon: "🛢️" }
] as const;

const UNKNOWN_REASONS: ScoreReason[] = [
    { id: "nutrition", label: "No nutrition data", points: 0 }
];

export class ProductAnalysis {
    readonly #product: Product["product"] | undefined;
    readonly #nutrition: ProductNutrition;
    readonly #scoreFunction: ScoreFunction;
    readonly #additiveImpact: AdditiveImpact;

    constructor(item: Product | undefined, options: ScoreOptions = {}) {
        this.#product = item?.product;
        this.#nutrition = this.#product?.nutrition ?? extractV2Nutrition(this.#product?.nutriments);
        this.#scoreFunction = options.useCustomScore ?? (settings.useCustomScore as ScoreFunction);
        this.#additiveImpact = additives.impact(this.#product?.additives_tags);
    }

    get exists() {
        return !!this.#product;
    }

    get name(): string {
        return this.#product?.product_name?.trim() || "Unknown product";
    }

    get brands(): string {
        return this.#product?.brands?.trim() || "Unknown Brand";
    }

    get imageUrl(): string | undefined {
        return this.#product?.image_front_url || this.#product?.image_url;
    }

    get nutriscoreGrade(): NutriScoreGrade {
        const grade = this.#product?.nutriscore_grade?.toLowerCase();
        return GRADES.includes(grade as NutriScoreGrade) ? (grade as NutriScoreGrade) : "unknown";
    }

    get novaGroup(): number | undefined {
        return this.#product?.nova_group;
    }

    get ecoscoreGrade(): EcoScoreGrade | undefined {
        return this.#product?.ecoscore_grade;
    }

    get labels(): string[] {
        return this.#product?.labels_tags ?? [];
    }

    get ingredients(): IngredientsInfo | undefined {
        if (this.#product?.ingredients_text_en) {
            return { text: this.#product.ingredients_text_en, isEnglish: true };
        }
        if (this.#product?.ingredients_text) {
            return { text: this.#product.ingredients_text, isEnglish: false };
        }
        return undefined;
    }

    get ingredientsText(): string | undefined {
        return this.ingredients?.text;
    }

    get isOrganic(): boolean {
        return (this.#product?.labels_tags ?? []).includes("en:organic");
    }

    get isRated(): boolean {
        return this.exists && this.nutriscoreGrade !== "unknown";
    }

    /**
     * Public API: score, rating and the reasons behind them.
     */
    get score(): number {
        if (!this.isRated) return 0;
        return this.#scoreFunction === "app" ? this.calculateAppScore() : NUTRI_SCORE_UI[this.nutriscoreGrade];
    }

    /** Contribution of every scoring rule, already clamped to the final score. */
    get scoreReasons(): ScoreReason[] {
        if (!this.isRated) return UNKNOWN_REASONS;

        if (this.#scoreFunction !== "app") {
            return [
                {
                    id: "nutrition",
                    label: `Nutri-Score ${this.nutriscoreGrade.toUpperCase()}`,
                    points: this.score
                }
            ];
        }

        const nutrition = NUTRI_POINTS[this.nutriscoreGrade];
        const additivePoints = Math.max(0, MAX_ADDITIVE_POINTS - this.#additiveImpact.penalty);
        const organic = this.isOrganic ? ORGANIC_BONUS : 0;
        const raw = nutrition + additivePoints + organic;
        const reasons: ScoreReason[] = [
            { id: "nutrition", label: `Nutrition (Nutri-Score ${this.nutriscoreGrade.toUpperCase()})`, points: nutrition },
            { id: "additives", label: "Additives", points: additivePoints }
        ];

        if (organic) reasons.push({ id: "organic", label: "Organic label", points: organic });

        if (this.#additiveImpact.hasHazardous && raw > HAZARD_CAP) {
            reasons.push({ id: "hazard-cap", label: "Hazardous additive cap", points: HAZARD_CAP - raw });
        }

        return reasons;
    }

    get rating(): Rating {
        if (!this.isRated) return RATING_BY_GRADE.unknown;

        // In Nutri-Score mode the displayed grade is the published grade, so the
        // star rating is derived from it directly. Deriving it from the 0-100
        // projection instead would mislabel grades C and D, because that
        // projection is not evenly spaced.
        if (this.#scoreFunction !== "app") {
            return RATING_BY_GRADE[this.nutriscoreGrade];
        }

        const s = this.score;
        if (s >= 90) return RATING_BY_GRADE.a;
        if (s >= 75) return RATING_BY_GRADE.b;
        if (s >= 60) return RATING_BY_GRADE.c;
        if (s >= 45) return RATING_BY_GRADE.d;
        return RATING_BY_GRADE.e;
    }

    get nutrients(): NutrientRow[] {
        if (!this.#product) return [];

        const levels = this.#product.nutrient_levels ?? {};

        return NUTRIENT_CONFIG.map(item => {
            const level = levels[item.id] as NutrientLevel | undefined;
            const measurement = this.#nutrition[item.id];

            return {
                id: item.id,
                label: item.label,
                icon: item.icon,
                value: measurement !== undefined ? measurement.value.toFixed(1) : null,
                unit: measurement !== undefined ? measurement.unit : "g",
                level
            };
        });
    }

    get hasNutrientData(): boolean {
        return this.nutrients.some(row => row.value !== null || row.level !== undefined);
    }

    get additives(): AdditiveInfo[] {
        return additives.list(this.#product?.additives_tags);
    }

    riskOf(tag: string) {
        return additives.riskOf(this.#additiveImpact, tag);
    }

    get calories(): CalorieInfo {
        const kcal = this.#nutrition.energyKcal;
        if (kcal === undefined) {
            return { value: 0, unit: "kcal", available: false };
        }
        return { value: Math.round(kcal), unit: "kcal", available: true };
    }

    /**
     * Internal Calculation: App-specific scoring logic
     */
    private calculateAppScore(): number {
        if (!this.#product) return 0;

        const nutritionBase = NUTRI_POINTS[this.nutriscoreGrade];
        const additivePoints = Math.max(0, MAX_ADDITIVE_POINTS - this.#additiveImpact.penalty);
        const organicBonus = this.isOrganic ? ORGANIC_BONUS : 0;

        let total = nutritionBase + additivePoints + organicBonus;

        // Penalty for hazardous additives (Yuka style)
        if (this.#additiveImpact.hasHazardous) total = Math.min(total, HAZARD_CAP);

        return Math.min(100, Math.max(0, total));
    }
}
