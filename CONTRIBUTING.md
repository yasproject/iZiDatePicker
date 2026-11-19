# Contributing to iZiDatePicker

Thanks for helping! A few ground rules keep the project healthy.

## Set up
```bash
git clone https://github.com/yasproject/iZiDatePicker.git && cd iZiDatePicker
npm ci
npm run build && npm run test:all
```
Node 18+ is required. `npm run test:browser` downloads a Chromium through puppeteer; set `CHROME_PATH` to use your own.

## Layout
- `izi-datepicker.js` is the single source file (UMD). `.mjs`, `.min.js`, the sourcemap and `izi-datepicker.locales.mjs` are **generated** by `npm run build`; commit them in the same PR (CI fails if they drift).
- `izi-datepicker.css` is plain CSS with custom properties (`--izi-*`); every class is prefixed `izi-`.
- `izi-datepicker.d.ts` must describe every public option, method and event.
- `tests/` holds jsdom suites; `tests/browser/` runs in a real browser and is the place for anything involving layout, focus, touch or colour contrast. jsdom cannot tell you whether a user can *see* something: several bugs were found only in a real browser, so UI changes need a browser test.
- `tools/` holds the holiday-data pipeline.

## Pull requests
1. One topic per PR; explain *why*.
2. Add or update tests (a bug fix needs a test that fails without the fix).
3. `npm run test:all` must pass and `npm run build` must stay within the size budget (`config.budgetGzip`). If a feature needs more bytes, say so in the PR.
4. Accessibility is a requirement, not a nice-to-have: keyboard operable, labelled, WCAG AA contrast (`axe-core` runs in the browser suite).
5. Never add holiday data you cannot source. `tools/build-holidays.mjs` rejects inconsistent or cloned years; do not bypass it with `--force`.
6. Update `CHANGELOG.md` and the README when behaviour changes.

## Translations
Interface strings live in `izi-datepicker.locales.js`. Native-speaker corrections are very welcome; please mention what you changed and why.

## Reporting bugs
Use the issue templates. A minimal reproduction (options + browser + what you expected) saves everyone time.
