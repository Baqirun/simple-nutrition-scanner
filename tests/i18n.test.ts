import { afterEach, describe, expect, it } from "vitest";
import en from "../messages/en.json" with { type: "json" };
import id from "../messages/id.json" with { type: "json" };
import * as m from "$lib/paraglide/messages";
import { baseLocale, getLocale, locales, setLocale } from "$lib/paraglide/runtime";

describe("i18n (Paraglide JS)", () => {
    afterEach(() => {
        setLocale("en", { reload: false });
    });

    it("configures English as base locale with Indonesian enabled", () => {
        expect(baseLocale).toBe("en");
        expect(locales).toEqual(["en", "id"]);
    });

    it("keeps English and Indonesian message keys in sync", () => {
        const enKeys = Object.keys(en).filter((k) => k !== "$schema").sort();
        const idKeys = Object.keys(id).filter((k) => k !== "$schema").sort();

        expect(idKeys).toEqual(enKeys);
    });

    it("switches translated output between en and id", () => {
        setLocale("en", { reload: false });
        expect(getLocale()).toBe("en");
        expect(m.home_check_button()).toBe("Check");
        expect(m.nav_history()).toBe("History");

        setLocale("id", { reload: false });
        expect(getLocale()).toBe("id");
        expect(m.home_check_button()).toBe("Cek");
        expect(m.nav_history()).toBe("Riwayat");
    });
});
