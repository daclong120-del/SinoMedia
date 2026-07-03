---
name: extract-design-rules
description: Distill the design system of an already-built frontend into a set of machine-readable JSON rule files — colors, typography, spacing, radius/elevation, motion, components, layout, and design philosophy. Reads the code (globals.css, components, Tailwind usage), NOT a live website. Use when the user wants to extract design rules, capture a design system, produce "design DNA", or generate JSON design tokens so another AI can create new, on-brand designs. Provide a source directory (defaults to `src/`).
argument-hint: "[source-dir] (defaults to src/)"
user-invocable: true
---

# Extract Design Rules

You are about to reverse-engineer the **design system** of an already-built frontend and distill it into a set of machine-readable JSON rule files. The source is **$ARGUMENTS** (default to `src/` if no path is given).

You are NOT cloning a live website and you are NOT using a browser. You are a **design forensics analyst reading source code** — `globals.css`, component files, Tailwind class usage, `layout.tsx` — and extracting the underlying rules, tokens, and philosophy that govern how this UI looks and feels.

The deliverable is a folder of JSON files that a *different* AI agent can read later to generate brand-new screens, components, and pages that feel like they belong to the same design system. Every file must be self-explanatory and prescriptive: not just "what the values are" but **"when and how to use them."**

## Goal & Consumer

The consumer of your output is another AI, not a human. That changes everything:

- **Prescriptive, not descriptive.** Each token carries a `usage` / `rules` field telling the reader when to reach for it. "Primary blue `rgb(0,81,195)`" is descriptive. "Use `primary` for the single most important action per view; never for more than one CTA in the same viewport" is prescriptive. Always write the second kind.
- **Self-contained.** The reader will NOT have the original code. Do not write "see globals.css line 84." Copy the actual value in.
- **Machine-parseable.** Valid JSON. Stable key names. Values in a normalized form (see conventions below). No comments in the JSON itself — put explanation in `notes`/`rules` string fields.
- **Grounded in evidence.** Every rule must trace to something you actually observed in the code. Do not invent a spacing scale the code doesn't use. If you infer a principle, mark it `"confidence": "inferred"` vs `"confidence": "observed"`.

## Pre-Flight

1. Resolve the source directory from `$ARGUMENTS` (default `src/`). Confirm it exists.
2. Locate the design-token source of truth. In this repo it is `src/app/globals.css` (Tailwind v4 `@theme inline` block + `:root` / `.dark` custom properties). If the project uses a different setup (tailwind.config, a tokens file, CSS modules), find it first.
3. Locate the font configuration — usually `src/app/layout.tsx` via `next/font`.
4. Enumerate the component files (`src/components/**`, `src/components/ui/**`) — these are your evidence for *how* tokens are actually applied.
5. Create the output directory: `docs/research/design-system/`. (Create it if missing; overwrite existing rule files.)

## Extraction Method

Work in this order. Each stage feeds the next.

### 1. Token harvest (from CSS/theme)

Read the full design-token source. Capture verbatim:
- Every color custom property in `:root` AND `.dark` (both themes — never extract only light).
- The `@theme inline` mappings (which raw var each semantic token points to).
- Radius scale (`--radius` and derived `--radius-*`).
- Font families (`--font-sans`, `--font-mono`, `--font-heading`, etc.).
- Any custom brand colors (e.g. `--color-cloudflare-orange`).
- Keyframes and `--animate-*` definitions.
- Anything in `@layer base` that sets global defaults (default border color, body bg/text, base font).

Preserve the **original color format** (oklch, rgb, hex) — do not convert. A downstream AI needs the exact string to reproduce it. Optionally add a `hex` field alongside for human sanity, but the canonical value stays as-authored.

### 2. Usage mining (from components)

Grep the component files for how each token and utility is actually used. This is what turns tokens into *rules*:
- Which elements use `bg-primary` vs `bg-secondary` vs `bg-accent`? (→ semantic color rules)
- What spacing utilities recur (`gap-*`, `p-*`, `space-y-*`)? Tally them to discover the *de facto* spacing scale, even if it isn't formally defined.
- What radius utilities appear on buttons vs cards vs inputs? (→ radius-by-component rules)
- What text size / weight combos appear on headings vs body vs labels? (→ type scale in practice)
- Which shadow utilities appear, and on what? (→ elevation rules)
- Recurring layout patterns: max-width containers, grid column counts, sticky/fixed usage, breakpoint prefixes (`md:`, `lg:`).

Use `Grep` with `output_mode: "count"` to tally utility frequency — frequency reveals which values are "the scale" vs one-offs.

### 3. Component pattern extraction

For each meaningful component (button, card, sidebar, header, drawer, etc.), record its recipe: the composition of tokens/utilities that defines that component's look — variant names, sizes, states (hover/active/disabled), and the class strings that produce them. A `button.tsx` with `cva` variants is a goldmine — capture every variant.

### 4. Philosophy synthesis

Step back from the values and articulate the *why*. What does the palette (mostly neutral grays + one saturated brand blue) tell you about the brand's personality? Is it dense/utilitarian (dashboard) or airy/marketing? How generous is spacing? How sharp or soft are corners? How restrained or expressive is motion? These become the design principles that keep future generated designs coherent.

## Output Files

Write these JSON files into `docs/research/design-system/`. Each begins with a `$meta` object and then thematic content.

Shared `$meta` shape (include in every file):
```json
{
  "$meta": {
    "domain": "color",
    "source": "src/app/globals.css, src/components/**",
    "extractedFrom": "code",
    "purpose": "Machine-readable design rules for AI-driven design generation"
  }
}
```

### `index.json`
A manifest: lists every rule file, a one-line summary of each, and a top-level `readingOrder` array telling a downstream AI which file to read first (usually `philosophy` → `color` → `typography` → `spacing` → the rest). Include a short `howToUse` string: how an AI should consume these files to generate a new design.

### `philosophy.json`
The design DNA in prose + structured principles.
```json
{
  "$meta": { ... },
  "personality": ["utilitarian", "trustworthy", "restrained", "dense-information"],
  "moodSummary": "Enterprise dashboard: neutral canvas, a single confident brand blue for action, minimal ornamentation, motion used sparingly for delight not spectacle.",
  "principles": [
    {
      "name": "Neutral canvas, single accent",
      "rule": "The UI is built almost entirely from neutral grays. Saturated color is reserved for the primary brand blue and appears only on the single most important interactive element per view.",
      "confidence": "observed",
      "evidence": "Palette is ~90% oklch grays; only --primary and --color-cloudflare-orange are saturated."
    }
  ],
  "doList": ["Lead with hierarchy through weight and spacing, not color"],
  "dontList": ["Don't introduce a second saturated accent color", "Don't use more than one primary CTA per viewport"]
}
```

### `color.json`
Every color, both themes, mapped to semantic roles with usage rules.
```json
{
  "$meta": { ... },
  "formatNote": "Canonical values are as-authored (oklch/rgb/hex). Do not convert when reproducing.",
  "brand": {
    "primary": { "light": "rgb(0, 81, 195)", "dark": "oklch(0.922 0 0)", "usage": "Single most important action per view; links; focus ring. Never more than one primary CTA in a viewport." },
    "cloudflareOrange": { "value": "rgb(246, 130, 31)", "usage": "Brand accent for logo/marketing highlights only, not for UI controls." }
  },
  "semantic": {
    "background": { "light": "oklch(0.9875 0 0)", "dark": "oklch(0.145 0 0)", "usage": "App canvas." },
    "foreground": { "light": "rgb(49, 49, 49)", "dark": "oklch(0.985 0 0)", "usage": "Default body text." },
    "card": { ... }, "muted": { ... }, "accent": { ... }, "destructive": { ... },
    "border": { "light": "oklch(0.145 0 0 / 0.1)", "dark": "oklch(1 0 0 / 10%)", "usage": "Hairline dividers and control borders; deliberately low-contrast." }
  },
  "sidebar": { "...": "sidebar-scoped token overrides" },
  "charts": ["oklch(0.87 0 0)", "..."],
  "pairing": [
    { "surface": "primary", "text": "primary-foreground", "rule": "Always pair a *-foreground token with its surface for contrast." }
  ]
}
```

### `typography.json`
Font families, the type scale observed in practice, weight usage, and heading rules. Include `fontStack` (full fallback chain from the theme), the role of each family (`sans` for UI/body, `mono` for code, `heading`), and a `scale` array of size/weight/lineHeight/usage tuples derived from mining the components.

### `spacing.json`
The spacing scale (from tokens if defined, otherwise the de-facto scale from utility frequency mining), plus layout rhythm rules: default gap between cards, section padding, container max-width, inline vs stack spacing. Include a `scale` array and a `rules` array.

### `radius-elevation.json`
Border-radius scale (`--radius` = 0.625rem and the derived `--radius-*` multipliers — reproduce the `calc()` relationships), which radius each component type uses, and the shadow/elevation ladder with usage (when a surface should float vs sit flat). Note if the design is largely shadowless.

### `motion.json`
Keyframes, `--animate-*` presets, transition durations/easings observed on hover/focus, and rules on restraint (e.g. "motion is decorative float on hero icons only; interactive feedback is fast opacity/color transitions"). Include the actual keyframe definitions and durations verbatim.

### `components.json`
A recipe per component. For each: `name`, `role`, `variants` (with the class recipe or token composition per variant), `sizes`, `states` (hover/active/disabled/focus), and a `composition` note describing how it's assembled. Capture `button.tsx` variants exhaustively — they encode the interactive vocabulary of the whole system.

### `layout.json`
Structural rules: breakpoints in use (from Tailwind prefixes observed), grid patterns (column counts per breakpoint), container widths, sticky/fixed regions (header, sidebar), z-index layering, and the overall app shell shape (e.g. "fixed sidebar + scrollable main"). Include a `responsive` section stating what collapses/stacks at each breakpoint.

## Quality Bar (Pre-Completion Checklist)

Before declaring done, verify:
- [ ] Every JSON file is valid JSON (parse it — run `node -e "require('./docs/research/design-system/<file>.json')"` or equivalent for each).
- [ ] Both light and dark values are captured for every themed color.
- [ ] Color values are as-authored (no silent oklch→hex conversion of the canonical value).
- [ ] Every token/rule has a `usage` or `rules` field written prescriptively (an AI could act on it without seeing the code).
- [ ] Radius `calc()` relationships are preserved, not flattened to guessed pixel values.
- [ ] `button.tsx` (or the primary interactive primitive) variants are captured exhaustively.
- [ ] Each principle in `philosophy.json` is tagged `observed` or `inferred` with evidence.
- [ ] `index.json` lists all files and gives a `readingOrder` + `howToUse`.
- [ ] No rule references a file/line the reader won't have — values are inlined.

## What NOT to Do

- **Don't invent a scale the code doesn't use.** If spacing is ad-hoc, say so and record the observed values with `"confidence": "inferred"` — don't fabricate a clean 4/8/12/16 scale that isn't there.
- **Don't convert canonical color formats.** oklch stays oklch. A downstream reproduction must be exact.
- **Don't skip dark mode.** Half the tokens live in `.dark`.
- **Don't write descriptive-only tokens.** Every entry earns its place by telling the reader *when to use it*.
- **Don't dump raw CSS.** You are distilling rules, not copying the stylesheet. Structure, group, and annotate.
- **Don't reference the source files as required reading.** The JSON must stand alone.
- **Don't merge everything into one giant file.** The thematic split is intentional — a downstream AI loads only the domains it needs.

## Completion

When done, report:
- Output directory and the list of JSON files written.
- Token counts: number of colors, type scale steps, spacing steps, component recipes captured.
- Notable design principles distilled (2–4 bullets).
- Any gaps or `inferred` (vs `observed`) rules the user should sanity-check.
