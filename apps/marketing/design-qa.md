# Marketing design QA

**Source visual truth:** Figma node `1956:3` and the attached Marketing website design export.

**Implementation evidence:** `http://localhost:3000/`, captured after page-load motion completed. Full-page comparison artifacts were captured locally in `/tmp/fieldsolo-marketing-prototype/figma-reference-full.png` and `/tmp/fieldsolo-marketing-prototype/local-alignment.png`.

**State:** Desktop default landing state; preview-only waitlist form.

**ZIP comparison (2026-06-21):** Ran the uploaded Vite prototype locally and
captured it beside the marketing implementation at the same 1000px desktop
viewport. The hero is matched to the ZIP's measured boxes: 896px copy column,
672px kicker, 952px card grid, 62px CTA row, and 939px hero height. The
implementation also follows the ZIP's 1024px problem-section stack breakpoint.

## Findings

- No actionable P0/P1/P2 mismatches remain.
- The final audit normalized the Figma reference to the browser's 966px desktop capture width: the reference measured 9,551px tall and the implementation 9,526px tall. Section boundaries, card geometry, alternating step cadence, and waitlist columns aligned across the full page.
- The ZIP-specific pass restored the original marquee, ambient movement,
  blueprint reveal, CTA pulse, card icon drift, card-hover lift, and staged
  entrance timing in the hero.
- The animation parity pass also restores ZIP motion contracts for the problem
  image composition, promise/how/features/pricing/FAQ/final-CTA reveals,
  instructional phone hover, card and accordion hover, waitlist entrance,
  floating early-access callout, field/radio/button feedback, dropdowns, and
  success-state celebration. Reduced-motion overrides remain in place.
- The first comparison exposed two P1 issues: hero copy was held in its initial motion variant, and supplied Figma imagery was replaced with generic mock UI. Both were corrected: the hero now animates to the visible variant and the six Figma-supplied images now render in the problem/how-it-works sections.

## Fidelity surfaces

- **Fonts and typography:** PT Serif and Ubuntu Sans Mono match the Figma/export pairing and preserve the serif display/monospace-detail hierarchy.
- **Spacing and layout rhythm:** desktop uses the source’s centered hero, three-card introduction, alternating instructional rows, wide dark promise section, and two-column waitlist layout; mobile collapses these areas to one column.
- **Colors and tokens:** cream paper, deep navy, and rust accent are centralized in the marketing tokens and reused across controls and sections.
- **Image quality and asset fidelity:** all six imagery assets supplied by Figma are stored under `public/images` and used at their corresponding visual locations.
- **Copy and content:** headings, FAQ, field labels, options, and final CTA follow the ZIP source.

## Interaction checks

- Sticky desktop/mobile navigation, anchor links, FAQ controls, form validation, custom multi-selects, radio controls, preview success state, and reduced-motion behavior are implemented in the client landing component.
- The production build and workspace typecheck pass.

## Follow-up polish

- Phase 2 should swap the preview-only submit transition for the real waitlist API response and confirmation state.

**final result: passed**

The final full-page visual comparison was completed at a normalized desktop
width, with source imagery, content, spacing, section hierarchy, controls, and
motion-ready states all rendered in the implementation.
