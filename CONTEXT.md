# Context — FieldSolo

## Project

**FieldSolo** — design system and app work under this repo. The **`design-system/`** tree holds shared tokens, components, preview, and Expo font loading.

## Figma

- **File:** [FieldSolo App](https://www.figma.com/design/TdvsllfeXrnkvBqR4qb3fn/Field-Book-App---gig-work-for-skilled-trade) (`fileKey`: `TdvsllfeXrnkvBqR4qb3fn`).
- **Components** generally live in the file’s Components area (e.g. frame **“Components”** — node id may vary by branch/version).

## In progress

- **Job Card** — Single component in Figma: [`661:2`](https://www.figma.com/design/TdvsllfeXrnkvBqR4qb3fn/Field-Book-App---gig-work-for-skilled-trade?node-id=661-2). Spacing uses **`design-system/tokens/spacing.json`** via bound **Spacing/** variables. Spec: **`design-system/components/job-card/spec.json`**. See **`LEARNINGS.md`** for MCP notes.

## Fonts / stack (high level)

- Web preview and Expo load FieldSolo fonts via **`design-system/fonts.css`**, **`design-system/expo/loadFieldSoloFonts.ts`**, and related typings.

## Where to look next session

- **`LEARNINGS.md`** — Figma MCP pitfalls, layout enums, workflow preference (Figma-first vs generated plugin code).
- **`design-system/scripts/`** — Ad-hoc scripts when needed (experimental Job Card MCP payloads were removed).
