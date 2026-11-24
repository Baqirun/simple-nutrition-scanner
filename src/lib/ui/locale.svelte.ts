import { getLocale, locales, setLocale, type Locale } from "$lib/paraglide/runtime";

export const LOCALE_LABELS: Record<Locale, string> = {
    en: "English",
    id: "Bahasa Indonesia"
};

class LocaleController {
    current = $state<Locale>(getLocale());
    readonly available = locales;

    constructor() {
        this.#syncDocumentLang(this.current);
    }

    set(next: Locale) {
        if (next === this.current) return;
        setLocale(next, { reload: false });
        this.current = next;
        this.#syncDocumentLang(next);
    }

    #syncDocumentLang(lang: Locale) {
        if (typeof document !== "undefined") {
            document.documentElement.lang = lang;
        }
    }
}

export const locale = new LocaleController();
