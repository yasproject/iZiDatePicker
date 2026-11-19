# Changelog

All notable changes to iZiDatePicker are documented here. This project follows [Semantic Versioning](https://semver.org/).

## 1.0.0 - first public release

iZiDatePicker started as a private Jalali date picker and was rewritten from scratch before this release; the public API starts at 1.0.0 and no legacy aliases are carried over.

### Features
- **Calendars:** Jalali (default) and Gregorian, selectable per instance; both can coexist on one page. Gregorian names, digits, direction, AM/PM and first weekday come from `Intl` for any locale tag; an optional locale pack (`izi-datepicker/locales`) adds interface strings for ar, de, es, fr, it, pt, ru, tr, zh, ja.
- **Modes:** single, range, multiple, week, month, time, time range (+ `datetime` shortcuts), booking time slots, compare two ranges, up to three months side by side, mouse drag-select.
- **Holidays:** fixed Iranian holidays (offline), weekly days off, optional Hijri estimate, and `holidays.sources` (json, map, dom, url/api, ics, csv, provider, versioned data pack with hash revalidation); list panel with type filter, click-to-locate, ICS/CSV/JSON export. Only Jalali year 1405 data is shipped.
- **Presets:** 23 built-in quick ranges + any `lastN`/`nextN`, draggable chip bar, constraint-aware (disabled with reason / clamped / hidden).
- **Look & feel:** sizes `xs`-`xl`/`fluid`, `accent` theming, light/dark/auto, shapes, density, radius, shadow, class names, CSS variables; mobile bottom sheet with swipe and 44 px targets.
- **Accessibility:** WAI-ARIA dialog + grid, RTL-aware keyboard navigation, live announcements, WCAG AA contrast (axe-core clean in every UI state tested).
- **Integration:** UMD, ESM, TypeScript definitions, headless mode, React, Vue 3 and custom-element wrappers, `data-izi` auto-init.
- **Documentation:** README and ten step-by-step guides in English and Persian, with real screenshots and an animated demo; the samples and links are tested.
- **Tooling:** holiday data pipeline (`tools/build-holidays.mjs`, `tools/update-holidays.mjs`), build with enforced size budget, jsdom + real-browser test suites.

### Verification (what was and was not checked)
- 860+ automated functional checks: 731 in jsdom and 135 in a real Chromium (layout, positioning, touch, drag, axe-core); plus every code sample (118) and every link / image / anchor (270) in the README and the guides.
- Jalali arithmetic matches `jalaali-js` and ICU's Persian calendar for every day of 1300-1500; Gregorian arithmetic matches the JS `Date` engine for 1900-2100.
- **Not verified:** Firefox, Safari/iOS, real screen readers (NVDA / VoiceOver), real devices, the React/Vue wrappers inside a real application, the GitHub Actions release/pages workflows (templates), and the ten interface translations (machine-assisted; native review welcome).

### Size
JS (everything included) is about 37.6 KB min+gzip, CSS about 7.8 KB. The budget lives in `package.json` (`config.budgetGzip`) and is enforced by `npm run build`.

### Known limitations
- Dates beyond the Jalali range 1300-1500 are not verified (ICS/ICU disagree on a few years later, e.g. 1503, 1602), hence the `maxYear` default of 1500.
- The Hijri estimate uses Umm al-Qura and is not Iran's official moon-sighting calendar.
- No Pashto locale, and `fa-AF` has no built-in holiday list.
