/**
 * iZiDatePicker v5 - type definitions
 * Weekday numbers everywhere follow JavaScript's Date.getDay(): 0 = Sunday ... 6 = Saturday.
 */

/** Calendar date + optional wall-clock time. All fields are numbers; seconds are always `second`. */
export interface iZiDateTime {
  /** Year / month / day IN THE PICKER'S OWN CALENDAR (named jy/jm/jd for history; identical to year/month/day below). */
  jy: number;
  jm: number; // 1-12
  jd: number; // 1-31
  /** Neutral aliases of jy / jm / jd - prefer these for Gregorian pickers. */
  year: number; month: number; day: number;
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
}
/** Date without time (what hooks and `beforeSelect` receive). */
export interface iZiDate { jy: number; jm: number; jd: number }
export interface GregorianDate { gy: number; gm: number; gd: number }

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type WeekdayInput = Weekday | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
export type HolidayType = 'official' | 'religious' | 'weekly';
/** single | range | multiple (several dates) | week (click a day = whole week) | month (month-only). 'datetime' / 'datetime-range' are v4 aliases. */
export type Mode = 'single' | 'range' | 'multiple' | 'week' | 'month' | 'time' | 'timerange' | 'datetime' | 'datetime-range';
export type CalendarSystem = 'jalali' | 'gregorian';
/** A date input accepted by min/max/disabled options and setValue. */
export type DateInput = string | Date | iZiDate | GregorianDate | 'today';

/* ------------------------------------------------------------------ locale */
export interface Locale {
  dir: 'rtl' | 'ltr';
  digits: 'fa' | 'latn';
  /** 12 Jalali month names, Farvardin first. */
  months: string[];
  /** 7 names, Sunday first. */
  weekdays: string[];
  weekdaysShort: string[];
  am: string; pm: string;
  today: string; clear: string; confirm: string; cancel: string;
  prevMonth: string; nextMonth: string; month: string; year: string;
  hour: string; minute: string; second: string; meridiem: string;
  start: string; end: string; time: string; week: string; dialog: string;
  rangePlaceholder: string; pickEnd: string; selected: string; cleared: string; loadingHolidays: string; invalid: string;
  /** Format used in the preview header, e.g. "dddd D MMMM YYYY". */
  previewFormat: string;
  holidayTypes: Record<HolidayType, string>;
  estimated: string;
  presetsLabel: string; years: string; prevYears: string; nextYears: string; prevYear: string; nextYear: string;
  presets: Record<string, string>;
  presetLast: string; presetNext: string; // templates with {n}
  holidaysTitle: string; holidayFilter: string; noHolidays: string; download: string; exportLabel: string;
  slotsLabel: string; pickDateFirst: string;
  compare: string; compareWith: string; previousPeriod: string; previousYear: string; customRange: string; primaryRange: string; compareRange: string; compareHint: string;
  presetReasons: Record<'disabled' | 'short' | 'long' | 'bounds' | 'invalid', string>;
  scrollLeft: string; scrollRight: string;
  weekdaysAbbr: string[]; // used by weekdayFormat:'short'
  /** RegExp source used to classify holiday titles as religious when the data has no `type`. */
  religiousPattern?: string;
  /** Recurring official holidays keyed "month-day" (e.g. "1-1"). */
  fixedHolidays: Record<string, string>;
  /** Titles of the optional Hijri-estimate layer. */
  hijriTitles: Record<string, string>;
}
/** 'fa' | 'en' | 'fa-AF' (Dari month names; needs native review) | a registered name | a partial locale object. */
export type LocaleOption = 'fa' | 'en' | 'fa-AF' | (string & {}) | (Partial<Locale> & { base?: string });

/** Built-in quick ranges. */
export type PresetId =
  | 'today' | 'yesterday' | 'tomorrow'
  | 'last7' | 'last14' | 'last30' | 'last90' | 'next7' | 'next14' | 'next30'
  | 'thisWeek' | 'lastWeek' | 'nextWeek' | 'weekToDate'
  | 'thisMonth' | 'lastMonth' | 'nextMonth' | 'monthToDate'
  | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear' | 'yearToDate'
  /** Any N: 'last45', 'next10', ... (1-3660 days). */
  | `last${number}` | `next${number}`;
export interface CustomPreset {
  id: string;
  label?: string;
  /** [start, end] (or a single date) or a function returning it. */
  range: [DateInput, DateInput] | DateInput | ((picker: iZiDatePicker) => [DateInput, DateInput] | DateInput);
}

/* ---------------------------------------------------------------- holidays */
export interface HolidayEntry {
  jm: number;
  jd: number;
  title?: string;
  /** If omitted it is inferred from the title (locale.religiousPattern), defaulting to "official". */
  type?: Exclude<HolidayType, 'weekly'>;
  estimated?: boolean;
}
/** The shape of the 1405.json / 1406.json files is accepted as-is. */
export interface HolidayFileItem {
  date?: string; // Gregorian YYYY-MM-DD
  shamsiDate?: string; // "1405/01/01"
  isHoliday?: boolean;
  holidayDesription?: string;
}
export interface HolidayFile { data: HolidayFileItem[]; totalCount?: number }
export type HolidayPayload = HolidayEntry[] | HolidayFileItem[] | HolidayFile;

/** Where holiday data comes from. Sources are tried in order (holidays.merge:'first') or combined (merge:'all'). */
/** Holiday data pack: <base>manifest.json ({years:{"1405":{count,sha256}}}) + <base>{year}.json (see tools/build-holidays.mjs). A year missing from the manifest is NOT an error; cached years are re-validated by hash once per session. */
export interface PackSource extends HolidaySourceBase { type: 'pack'; base?: string; manifest?: string; file?: string; headers?: Record<string, string>; timeoutMs?: number; fetch?: (url: string, init: RequestInit) => Promise<Response> }
export interface HolidaySourceBase {
  /** Shown in the holidaysLoaded event's `source`. */
  name?: string;
  /** Only used for these Jalali years / this inclusive range. */
  years?: number[]; from?: number; to?: number;
  /** Applied to the raw response (after format parsing) -> array / file shape / date-keyed map. */
  transform?: (raw: any, year: number) => any;
  /** Dotted path ('result.items') or function locating the array inside the response. */
  path?: string | ((raw: any) => any);
  /** Map arbitrary API fields to date | shamsiDate | jm | jd | title | type | isHoliday (dotted path or function). */
  fields?: Partial<Record<'date' | 'shamsiDate' | 'jm' | 'jd' | 'title' | 'type' | 'isHoliday', string | ((item: any) => any)>>;
  /** Translate raw type strings to 'official' | 'religious'. */
  typeMap?: Record<string, 'official' | 'religious'>;
}
/** Inline data: a payload ({data:[...]}, [...]) or a per-year map {1405: payload}. */
export interface JsonSource extends HolidaySourceBase { type: 'json'; data: HolidayPayload | Record<number, HolidayPayload> }
/** Date-keyed object: 'YYYY-MM-DD' (Gregorian), 'YYYY/MM/DD' (Jalali), 'MM-DD' (recurring Jalali) -> title | {title,type}. */
export interface MapSource extends HolidaySourceBase { type: 'map'; data: Record<string, string | { title: string; type?: 'official' | 'religious' }> }
/** Reads JSON from an element such as <script type="application/json" id="h">. */
export interface DomSource extends HolidaySourceBase { type: 'dom'; selector: string }
/** HTTP endpoint (a static JSON file or a real API). Placeholders: {year}, {gy}, {gy2}. */
export interface UrlSource extends HolidaySourceBase {
  type: 'url' | 'api';
  url: string | ((jy: number) => string);
  method?: string;
  headers?: Record<string, string> | ((jy: number) => Record<string, string>);
  /** Query parameters; values may use placeholders or be functions. */
  params?: Record<string, string | number | ((jy: number) => string | number)>;
  /** Object bodies are sent as JSON. */
  body?: unknown | ((jy: number) => unknown);
  credentials?: RequestCredentials;
  timeoutMs?: number;
  /** 'json' (default), 'ics' (iCalendar) or 'csv'. */
  format?: 'json' | 'ics' | 'csv';
  /** Custom fetch (auth wrappers, tests). */
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
}
export interface ProviderSource extends HolidaySourceBase { type: 'provider'; fn: (jy: number) => Promise<HolidayPayload> | HolidayPayload }
export type HolidaySource = JsonSource | MapSource | DomSource | UrlSource | ProviderSource | PackSource;

export interface HolidaysConfig {
  /** Ordered list of sources (any mix of json / map / dom / url / api / provider). */
  sources?: HolidaySource[];
  /** 'first' (default): first source that yields data wins. 'all': union of every source. */
  merge?: 'first' | 'all';
  /** Default timeout for url sources. Default 8000. */
  timeoutMs?: number;
  /** Namespace for the localStorage cache key. */
  cacheKey?: string;
  /** L1. 'fallback' (default): used only for years without L3/L4 data. 'always': merged into every year. false: off. Array: custom list replaces the built-in one. */
  fixed?: 'fallback' | 'always' | false | HolidayEntry[];
  /** L3. Per-year data, keyed by Jalali year. AUTHORITATIVE for that year. */
  data?: Record<number, HolidayPayload>;
  /** L3 lazy. URL template ("/h/{year}.json") or function. */
  url?: string | ((jy: number) => string);
  /** L4. Async provider; may reject (the layer below is used instead). */
  provider?: (jy: number) => Promise<HolidayPayload> | HolidayPayload;
  /** L5. Opt-in estimate from Intl umalqura. Off by default: Iran's official dates differ by up to 1-2 days. */
  hijri?: false | 'estimate';
  /** 'memory' (default) | 'storage' (localStorage) | false. */
  cache?: 'memory' | 'storage' | false;
  cacheTtlDays?: number;
  /** Minimum delay before retrying a failed year. Default 60000. */
  retryMs?: number;
}
export interface HolidayInfo {
  types: HolidayType[]; // priority order: religious, official, weekly
  primary: HolidayType | null;
  titles: string[];
  loading: boolean;
  estimated: boolean;
}

/* --------------------------------------------------------- cells and state */
export interface CalendarCell {
  key: number; // YYYYMMDD integer
  jy: number; jm: number; jd: number;
  jdn: number; // Julian Day Number
  gregorian: GregorianDate;
  weekday: Weekday;
  outside: boolean; // belongs to the previous/next month
  today: boolean;
  disabled: boolean;
  /** Range endpoints. 'both' = same-day range. Interior days are `inRange`, NOT selected. */
  selected: 'start' | 'end' | 'both' | null;
  /** Strict interior of the range (endpoints excluded). */
  inRange: boolean;
  /** Hover preview while the second endpoint is pending. */
  preview: boolean;
  weekend: boolean;
  holiday: HolidayInfo | null;
  focus: boolean;
  year: number; month: number; day: number;
  /** Comparison range membership (compare option). */
  cmp: 'start' | 'end' | 'both' | null; cmpIn: boolean;
  /** Only with secondaryCalendar. */
  secondary?: string;
  text: string; // localised day number
  label: string; // accessible label
  tip: string;
}
export interface CalendarState {
  mode: Mode;
  calendar: CalendarSystem;
  isOpen: boolean;
  loading: boolean;
  view: { jy: number; jm: number; monthName: string; title: string };
  /** 6 weeks x 7 days in display order. */
  /** Empty in month mode. */
  weeks: CalendarCell[][];
  /** One entry per displayed month (options.months); weeks/view above describe the first one. */
  calendars: Array<{ year: number; month: number; monthName: string; title: string; weeks: CalendarCell[][]; weekNumbers: string[] | null }>;
  /** Month mode only: 12 month cells. */
  months: Array<{ key: number; jy: number; jm: number; name: string; text: string; label: string; today: boolean; selected: boolean; disabled: boolean; focus: boolean }> | null;
  weekdays: Array<{ index: Weekday; name: string; short: string }>;
  weekNumbers: string[] | null;
  focus: number;
  canPrev: boolean;
  canNext: boolean;
  selection: { start: iZiDateTime | null; end: iZiDateTime | null; list: iZiDateTime[]; pending: boolean };
  value: { start: iZiDateTime | null; end: iZiDateTime | null; list: iZiDateTime[] };
  time: Record<'start' | 'end', unknown> | null;
  today: iZiDateTime;
  timeOnly: boolean;
  slots: { items: Array<{ time: string; label: string; disabled: boolean; selected: boolean }>; cols: number; hint: string; label: string } | null;
  compare: { enabled: boolean; mode: CompareMode; target: 'primary' | 'compare'; text: string; range: { start: iZiDateTime; end: iZiDateTime } | null } | null;
  holidayList: { title: string; items: Array<{ key: number; day: string; weekday: string; title: string; primary: HolidayType; types: HolidayType[]; estimated: boolean }>; types: Array<{ id: HolidayType; label: string; count: string; on: boolean }>; loading: boolean } | null;
}
export type CompareMode = 'previousPeriod' | 'previousYear' | 'custom';
export interface HolidayRecord { date: string; gy: number; gm: number; gd: number; year: number; month: number; day: number; localDate: string; weekday: string; title: string; type: HolidayType; types: HolidayType[]; estimated: boolean }

/* ------------------------------------------------------------------ events */
export interface SelectPayload { value: iZiDateTime | null; formatted: string; /** multiple mode */ values?: iZiDateTime[]; /** timeSlots: end of the chosen slot */ end?: iZiDateTime | null }
export interface RangePayload { start: iZiDateTime | null; end: iZiDateTime | null; formatted: string; /** compare option */ compare?: { start: iZiDateTime; end: iZiDateTime } | null }
export interface BeforeSelectPayload { date: iZiDate; key: number; mode: 'single' | 'range' }
export type CloseReason = 'select' | 'confirm' | 'cancel' | 'clear' | 'escape' | 'outside' | 'blur' | 'api' | 'destroy';

export interface EventMap {
  open: Record<string, never>;
  close: { reason: CloseReason };
  select: SelectPayload;
  rangeSelect: RangePayload;
  change: SelectPayload | RangePayload;
  clear: Record<string, never>;
  changeMonth: { jy: number; jm: number };
  changeYear: { jy: number };
  /** Cancelable: return false from a listener / onBeforeSelect to veto. */
  beforeSelect: BeforeSelectPayload;
  holidaysLoaded: { year: number; source?: string };
  holidaysError: { year: number; error: unknown };
  invalidInput: { text: string };
  update: CalendarState;
  destroy: Record<string, never>;
}

/* ----------------------------------------------------------------- options */
export interface FooterButton {
  id: string;
  text: string;
  icon?: string; // inner SVG markup (24x24 viewBox)
  disabled?: boolean;
  onClick?: (picker: iZiDatePicker) => void;
}
export type BuiltInFooterButton = 'today' | 'clear' | 'confirm' | 'cancel';

export interface iZiOptions {
  /* calendar system */
  /** 'jalali' (default) or 'gregorian'. Gregorian month/weekday/AM-PM names and digits come from Intl for ANY `locale` tag; UI strings: see izi-datepicker.locales.js. */
  calendar?: CalendarSystem;
  /** How an ambiguous typed date with the year last is read: 'dmy' (default) or 'mdy' (US). */
  dateOrder?: 'dmy' | 'mdy';

  /* mode & value */
  mode?: Mode; // 'datetime' / 'datetime-range' are v4 aliases for mode + timePicker
  inline?: boolean;
  value?: string | Date | iZiDate | GregorianDate | [DateInput, DateInput] | { start: DateInput; end: DateInput } | DateInput[] | null;
  placeholder?: string | null;

  /* output */
  /** Token format: YYYY YY MMMM MMM MM M dddd ddd DD D HH H hh h mm m ss s A, [escaped]. Or the literal 'timestamp'. Default: YYYY/MM/DD (+ time when timePicker). */
  format?: string | null;
  rangeSeparator?: string;
  /** Calendar used for typed/formatted TEXT (default: the picker's own calendar). */
  outputCalendar?: CalendarSystem | null;
  /** Digits written into the INPUT. Default 'latn' (machine-readable). */
  inputDigits?: 'latn' | 'fa' | 'locale';
  /** Digits shown in the UI. Default 'locale'. */
  digits?: 'latn' | 'fa' | 'locale';
  /** Dispatch native input/change events after a picker-driven change (framework friendly). Default true. */
  emitInputEvents?: boolean;

  /* appearance */
  locale?: LocaleOption;
  theme?: 'light' | 'dark' | 'auto';
  /** xs 260px | sm 300 | md 340 (default) | lg 400 | xl 480 | fluid (100% of the container; use with inline). 'small'/'normal'/'large' are legacy aliases. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fluid' | 'small' | 'normal' | 'large';
  /** Exact width (number = px, or any CSS length). Overrides `size`'s width. */
  width?: number | string;
  /** Base font size (number = px). Everything scales with it. */
  fontSize?: number | string;
  fontFamily?: string;
  /** One colour re-derives the whole palette (selection, hover, range band, glow). Named: blue | ocean | rose | emerald | violet | amber | slate, or any CSS colour. */
  accent?: 'blue' | 'ocean' | 'rose' | 'emerald' | 'violet' | 'amber' | 'slate' | (string & {}) | null;
  /** Fine-grained palette overrides (CSS colours). `primary` is the same as `accent`. */
  colors?: Partial<Record<'primary' | 'background' | 'surface' | 'text' | 'textSecondary' | 'border' | 'hover' | 'range' | 'onPrimary' | 'faded' | 'today' | 'weekend' | 'weekendBg' | 'holiday' | 'holidayBg' | 'religious' | 'religiousBg' | 'weekly' | 'weeklyBg' | 'danger' | 'success', string>>;
  /** Raw CSS custom properties applied to the root, e.g. { '--izi-gap': '2px' }. */
  cssVars?: Record<string, string> | null;
  /** Corner radius: preset or px. */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | number | null;
  cellShape?: 'rounded' | 'circle' | 'square';
  density?: 'compact' | 'normal' | 'comfortable';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | null;
  /** narrow = one letter (default) | short = 3-4 letters | long = full names. */
  weekdayFormat?: 'narrow' | 'short' | 'long';
  /** false: days of the neighbouring months are blank (rows that become entirely blank are removed). */
  showOutsideDays?: boolean;
  /** false: hide the weekday header row. */
  showWeekdays?: boolean;
  highlightWeekend?: boolean;
  highlightHolidays?: boolean;
  highlightToday?: boolean;
  /** 'fade' (default) | 'none'. Reduced-motion users never get animation. */
  animation?: 'fade' | 'none' | false;
  /** Extra class names per part. */
  classNames?: Partial<Record<'root' | 'preview' | 'header' | 'presets' | 'chip' | 'grid' | 'weekday' | 'cell' | 'today' | 'selected' | 'inRange' | 'disabled' | 'holiday' | 'weekend' | 'outside' | 'footer' | 'button', string>>;
  customClass?: string;
  dir?: 'rtl' | 'ltr' | null;
  showPreview?: boolean;
  showMonthYearSelector?: boolean;
  showWeekNumbers?: boolean;
  showButtonIcons?: boolean;
  tooltip?: boolean;
  /** 'auto' | 'none' | list. 'auto' = [today, clear] (+ confirm, cancel when confirmation is required). */
  footerButtons?: 'auto' | 'none' | Array<BuiltInFooterButton | FooterButton>;

  /* calendar */
  /** 0-6 (Sunday = 0), an English weekday name, or 'auto' (default): Saturday for Jalali, the locale's first day (Intl weekInfo) for Gregorian. */
  firstDayOfWeek?: WeekdayInput | 'auto';
  /** Visual-only highlight. Default: [4, 5] (Thu, Fri) for Jalali, the locale's weekend for Gregorian. */
  weekend?: WeekdayInput[] | null;
  /** Weekly holidays (type "weekly"). Default: [5] (Friday) for Jalali, none for Gregorian. */
  weeklyHolidays?: WeekdayInput[] | null;
  minYear?: number;
  maxYear?: number;
  timeZone?: 'local' | string; // IANA, e.g. 'Asia/Tehran'. Controls "today" and timestamps.

  /* constraints */
  minDate?: DateInput | null;
  maxDate?: DateInput | null;
  disablePast?: boolean;
  disableFuture?: boolean;
  disabledDates?: DateInput[];
  disabledRanges?: Array<[DateInput, DateInput]>;
  disabledWeekdays?: WeekdayInput[];
  /** true = all types; or a list of types. Precedence: any matching rule disables the day. */
  disableHolidays?: boolean | HolidayType | HolidayType[];
  isDateDisabled?: ((d: iZiDate & { key: number; weekday: Weekday }) => boolean) | null;

  /* range */
  /** Second click before the first: 'swap' (default) or 'restart'. */
  rangeBacktrack?: 'swap' | 'restart';
  /** false: a range that would contain a disabled day restarts at the clicked day. */
  rangeSpanDisabled?: boolean;

  /* time */
  timePicker?: boolean;
  timeFormat?: '12h' | '24h';
  timeStep?: number; // minute step
  showSeconds?: boolean;
  minTime?: string | null; // "HH:mm[:ss]", applied to every day
  maxTime?: string | null;
  defaultTime?: string;
  defaultEndTime?: string;

  /* behaviour */
  /** 'auto': require Confirm only when timePicker is on. true: always. false: commit every change. */
  confirm?: 'auto' | boolean;
  closeOnSelect?: boolean;
  closeOnClear?: boolean;
  closeOnOutsideClick?: boolean;
  openOn?: 'click' | 'focus' | 'both';
  restoreFocus?: boolean;
  /** Parse while typing (navigates the view). Commit always happens on change/Enter. */
  syncWithInput?: boolean;

  /* placement */
  appendTo?: string | HTMLElement;
  position?: 'auto' | 'top' | 'bottom';
  offsetX?: number;
  offsetY?: number;
  zIndex?: number;
  lockScroll?: boolean;

  /* v5.3 */
  /** 1-3 months side by side (wraps under each other when the container is narrow; stacked in the mobile sheet). Not for month mode. */
  months?: 1 | 2 | 3;
  /** Press-move-release with the mouse/pen selects a range (range mode). Default true. */
  dragSelect?: boolean;
  /** Holiday panel beside/below the calendar with type filter and ICS/CSV/JSON export. */
  holidayList?: boolean | { position?: 'side' | 'bottom'; types?: HolidayType[]; export?: Array<'ics' | 'csv' | 'json'>; scope?: 'year' | 'view';
    /** What the panel lists: the displayed month(s) ('view', default) or the whole displayed year grouped by month ('year'; clicking an item changes month). */
    listScope?: 'view' | 'year';
    /** Clicking an item: 'locate' (default) goes to the day and highlights it (pulse + persistent outline), 'select' also selects it. Hovering/focusing an item previews its day. */
    onClick?: 'locate' | 'select' };
  /** Compare the chosen range with another one (range / week modes). Adds a "Compare" row; Confirm is required. */
  compare?: boolean | { modes?: CompareMode[]; mode?: CompareMode; enabled?: boolean; separator?: string };
  /** Booking-style time slots for mode 'single' (replaces the time selectors). duration:0 = single times. */
  timeSlots?: boolean | { step?: number; duration?: number; min?: string; max?: string; showEnd?: boolean; columns?: number; disabled?: string[] | ((date: iZiDateTime, time: string) => boolean) };

  /* v5.1: modes & helpers */
  /** Quick-range chips. 'default' = today/last7/last30/thisMonth/lastMonth (range modes) or today/yesterday. */
  presets?: false | 'default' | 'all' | Array<PresetId | CustomPreset> | { include?: PresetId[]; exclude?: PresetId[]; custom?: CustomPreset[] };
  /** 'scroll' (default; drag / wheel / arrows) or 'wrap' (all chips visible at once). */
  presetsLayout?: 'scroll' | 'wrap';
  presetsPosition?: 'top' | 'bottom';
  /** A preset that violates minRangeDays / maxRangeDays / min-max dates / disabled days: 'disable' (greyed, tooltip says why), 'clamp' (trimmed to the allowed window), 'hide'. */
  presetsOverflow?: 'disable' | 'clamp' | 'hide';
  /** Show the ‹ › scroll buttons on the chip bar. Default true. */
  presetsArrows?: boolean;
  /** Inclusive day counts; while the first endpoint is pending, out-of-range days are disabled. */
  minRangeDays?: number;
  maxRangeDays?: number;
  /** multiple mode: maximum selected dates (0 = unlimited). */
  maxDates?: number;
  multipleSeparator?: string;
  /** Small second label under each day. 'hijri' is an Intl umalqura approximation. */
  secondaryCalendar?: false | 'gregorian' | 'jalali' | 'hijri';
  /** 'grid' replaces the year <select> with a paged year grid (better on phones). */
  yearPicker?: 'select' | 'grid';
  /** Bottom sheet instead of a popover. 'auto' = viewport <= 520px. */
  sheet?: 'auto' | boolean;
  /** Horizontal swipe changes month (touch/pen only). Direction follows RTL/LTR. */
  swipe?: boolean;
  /** Set inputmode="none" so the virtual keyboard stays closed. 'auto' = coarse pointers only. */
  suppressKeyboard?: 'auto' | boolean;
  /** 'fixed' (default) or 'absolute' (use inside a transformed / will-change ancestor). */
  strategy?: 'fixed' | 'absolute';

  /* holidays */
  /** false disables highlighting and disableHolidays entirely. */
  holidays?: HolidaysConfig | false;

  /* render hooks. Return undefined to keep the default. A returned string is inserted as TEXT; return an Element for markup. */
  renderDay?: ((cell: CalendarCell) => HTMLElement | DocumentFragment | string | undefined) | null;
  /** Replaces the header on every update. Use data-act="prev"/"next" on your own buttons to keep navigation working. */
  renderHeader?: ((state: CalendarState) => HTMLElement | DocumentFragment | string | undefined) | null;
  renderFooter?: ((state: CalendarState) => HTMLElement | DocumentFragment | string | undefined) | null;

  /* callbacks (sugar over picker.on) */
  onOpen?: (picker: iZiDatePicker) => void;
  onClose?: (reason: CloseReason, picker: iZiDatePicker) => void;
  onSelect?: (value: iZiDateTime | null, formatted: string, picker: iZiDatePicker) => void;
  onRangeSelect?: (start: iZiDateTime | null, end: iZiDateTime | null, formatted: string, picker: iZiDatePicker) => void;
  onChange?: (payload: SelectPayload | RangePayload, picker: iZiDatePicker) => void;
  onClear?: (picker: iZiDatePicker) => void;
  onChangeMonth?: (jm: number, jy: number, picker: iZiDatePicker) => void;
  onChangeYear?: (jy: number, picker: iZiDatePicker) => void;
  onBeforeSelect?: (date: iZiDate, payload: BeforeSelectPayload, picker: iZiDatePicker) => boolean | void;
  onHolidaysLoaded?: (p: { year: number; source?: string }, picker: iZiDatePicker) => void;
  onHolidaysError?: (p: { year: number; error: unknown }, picker: iZiDatePicker) => void;
  onInvalidInput?: (text: string, picker: iZiDatePicker) => void;
  onUpdate?: (state: CalendarState, picker: iZiDatePicker) => void;
  onDestroy?: (picker: iZiDatePicker) => void;
}

export type ValueFormat = 'string' | 'object' | 'timestamp' | 'iso' | 'gregorian' | 'jalali' | 'date' | 'time';

/* --------------------------------------------------------------- converter */
export interface JalaliConverter {
  toJalali(gy: number, gm: number, gd: number): iZiDate;
  toGregorian(jy: number, jm: number, jd: number): GregorianDate;
  isLeap(jy: number): boolean;
  monthLength(jy: number, jm: number): 29 | 30 | 31;
  /** Julian Day Number. */
  toJDN(jy: number, jm: number, jd: number): number;
  fromJDN(jdn: number): iZiDate;
  /** 0 = Sunday ... 6 = Saturday, from a JDN. Timezone independent. */
  dayOfWeek(jdn: number): Weekday;
  isValid(jy: number, jm: number, jd: number): boolean;
  parse(text: string, locale?: LocaleOption): (iZiDateTime & { hasTime: boolean }) | null;
  format(v: Partial<iZiDateTime> & iZiDate, fmt: string, locale?: LocaleOption): string;
}

/* ------------------------------------------------------------------- class */
export declare class HolidayProvider {}

export default class iZiDatePicker {
  /** Pass null for HEADLESS mode (no DOM). */
  constructor(target: string | HTMLInputElement | HTMLElement | null, options?: iZiOptions);

  static readonly version: string;
  static readonly defaults: Required<Pick<iZiOptions, 'mode'>> & iZiOptions;
  static readonly converter: JalaliConverter;
  /** Gregorian helpers: { isLeap, monthLength, toJDN, fromJDN -> {gy,gm,gd}, dayOfWeek, isValid }. */
  static readonly gregorian: { isLeap(y: number): boolean; monthLength(y: number, m: number): number; toJDN(y: number, m: number, d: number): number; fromJDN(jdn: number): GregorianDate; dayOfWeek(jdn: number): Weekday; isValid(y: number, m: number, d: number): boolean };
  static getInstance(el: string | Element): iZiDatePicker | null;
  static init(selector: string, options?: iZiOptions): iZiDatePicker[];
  /** Creates a picker for every [data-izi] element (JSON options in the attribute). Idempotent. Also runs automatically for <script data-auto-init>. */
  static autoInit(root?: ParentNode): iZiDatePicker[];
  /** Headless instance (no DOM). */
  static create(options?: iZiOptions): iZiDatePicker;
  static registerLocale(name: string, locale: Partial<Locale>): void;

  readonly el: HTMLElement | null;
  readonly isOpen: boolean;
  readonly destroyed: boolean;
  readonly headless: boolean;

  open(opts?: { focus?: boolean }): this;
  close(reason?: CloseReason, restoreFocus?: boolean): this;
  toggle(): this;
  destroy(): void;

  /** Returns false when the value is invalid or disabled. */
  setValue(v: NonNullable<iZiOptions['value']>, opts?: { silent?: boolean }): boolean;
  clear(opts?: { silent?: boolean }): this;
  /** single: scalar; range/week: {start,end}; multiple: array. */
  getValue(format?: ValueFormat): string | number | Date | iZiDateTime | { start: unknown; end: unknown } | unknown[] | null;
  getRange(): { start: iZiDateTime | null; end: iZiDateTime | null };
  /** Committed comparison range (compare option) or null. */
  getCompare(): { start: iZiDateTime; end: iZiDateTime } | null;
  /** Holidays of a period as objects (awaits lazy sources). { year } | { from, to } | { scope: 'view' | 'year' }, optional types. */
  listHolidays(o?: { year?: number; from?: DateInput; to?: DateInput; scope?: 'view' | 'year'; types?: HolidayType[] }): Promise<HolidayRecord[]>;
  /** iCalendar / CSV / JSON text (same options as listHolidays). */
  exportHolidays(o?: { year?: number; from?: DateInput; to?: DateInput; scope?: 'view' | 'year'; types?: HolidayType[]; format?: 'ics' | 'csv' | 'json' | 'object' }): Promise<string | HolidayRecord[]>;
  /** Offers the export as a browser download; resolves true when a file was offered. */
  downloadHolidays(o?: { year?: number; scope?: 'view' | 'year'; types?: HolidayType[]; format?: 'ics' | 'csv' | 'json'; filename?: string }): Promise<boolean>;
  setOptions(partial: iZiOptions): this;

  goTo(jy: number, jm?: number): this;
  next(): this;
  prev(): this;
  /** Programmatic click on a day (also the headless entry point). */
  select(d: iZiDate | number): boolean;
  commit(): boolean;

  getState(): CalendarState;
  getMonthData(): CalendarCell[][];

  on<K extends keyof EventMap>(name: K, fn: (payload: EventMap[K]) => unknown): () => void;
  once<K extends keyof EventMap>(name: K, fn: (payload: EventMap[K]) => unknown): () => void;
  off<K extends keyof EventMap>(name: K, fn?: (payload: EventMap[K]) => unknown): this;
}

export { iZiDatePicker };
