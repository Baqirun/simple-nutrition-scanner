# Real product fixtures

Raw `GET /api/v2/product/{barcode}.json` bodies captured from Open Food Facts,
kept so parsing and analysis tests can run offline against payloads the real API
actually returns — including the messy, incomplete ones.

## Layout

| File | What it is |
|---|---|
| `catalog.json` | The source of truth: barcode, file name, `scenario`, and why the case exists |
| `<barcode>.json` | The response body, stored byte-for-byte as received |
| `manifest.json` | Generated digest for humans: HTTP status, whether a product was found, grade, Nova group, nutrient keys, additive risks. Never read by tests |

The catalog, not the manifest, decides what is captured. Tests read the raw
files directly, so editing the manifest cannot make a test lie.

## Refreshing

```bash
# fetch catalog entries that have no file yet (resumes a partial run)
bun tests/capture-real-products.mjs

# refetch everything, e.g. after the API payload shape changes
bun tests/capture-real-products.mjs --refresh

# one or two products
bun tests/capture-real-products.mjs --only=3017620422003,20724696

# discover candidates for a new scenario
bun tests/capture-real-products.mjs --search='additives_tags=en:e250&page_size=10'
```

Every request — searches included — waits **6.5 s** after the previous one, so
the script stays under Open Food Facts' 10 requests/minute guidance. A `429` or
`503` backs off for 65–90 s and retries up to three times rather than failing
the whole run.

## Choosing scenarios

A fixture is worth adding when it pins down a branch that would otherwise be
guessed at from synthetic data, for example:

- a field the app reads but the API often omits (`nutrient_levels`, `nova_group`,
  `ingredients_text_en`, `image_front_url`);
- a field whose real values differ from the TypeScript union (`a-plus`,
  `not-applicable`, empty names);
- nutrient key variants (`salt` vs `sodium`, `_prepared_100g`, `energy-kj_100g`,
  numeric strings);
- additive lists long enough to exhaust the penalty budget, or containing a
  hazardous tag.

Add the barcode to `catalog.json` with the gap it covers, then let the script
fetch it.

## API version

The app still calls the **deprecated v2** read endpoint, so these bodies are v2
envelopes (`status: 1`, `status_verbose`, flat `product.nutriments`,
`product.ecoscore_grade`). v2 is explicitly still supported for backward
compatibility, but v3.6 is the current API and is not response-compatible:

- envelope becomes `status: "success"` plus `result`, `errors`, `warnings`;
- `ecoscore_grade` is renamed `environmental_score_grade` (since v3.1);
- `nutriments` is replaced by `nutrition.aggregated_set.nutrients` in v3.6
  (v3.4 still has `nutriments`).

Captures target production because the fixtures must mirror what the app
actually receives. For throwaway experiments, Open Food Facts asks clients to
use staging (`https://world.openfoodfacts.net`, basic auth `off:off`) instead.

