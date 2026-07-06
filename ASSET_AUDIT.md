# ASSET_AUDIT — editorial image intake (2026-07-06)

Every image below was opened and inspected by eye (rule 18) before any decision.
Intake: `apps/web/public/identity assets/` → production: `apps/web/public/media/editorial/`.
Generated amounts, dates, IDs inside images are **props, never product data**; anything that could
be mistaken for live data is blurred at move time (baked into the production copy; the intake
original remains in git history).

| # | File | Visible subject | Realism | Placement | Crop / mask | Decision |
| - | ---- | --------------- | ------- | --------- | ----------- | -------- |
| 1 | physical-payment-rails | Macro of machined metal channels with copper traces routing like rails. No text. | 5/5 | Landing "Gateway settles on Arc" step — card background (~40%) | none | **KEEP_AS_BACKGROUND** |
| 2 | secure-personal-access | Phone + black card, both carrying a **generated, incorrect "Sluice" logo** as the main subject; blurry fake UI. | 4/5 craft, but wrong brand | — | Logo is the subject; cannot be cropped out | **REJECT** |
| 3 | metered-units-index | Editorial desk: SECONDS ruler, highlighted transcript ("We measure everything"), call log, waveform card, mechanical counter, API-call tag. | 5/5 | Landing units section — split figure (~70%) | none (prop text well-formed, clearly editorial) | **KEEP** |
| 4 | royalty-split-routing | One master cable fanning into six labeled collaborator jacks (Songwriter → Publisher), "Master" tag. | 5/5 | /app/earn royalty-split explanation — visible figure (~85%) | none | **KEEP** |
| 5 | creator-earning-moment | Writer's desk at night; laptop shows a **fake "Payout alert $612.75"**. | 4/5 | — | The payout screen *is* the concept; blurring it leaves a generic desk. Third image on /app/earn would break "one dominant image per app page". | **REJECT** (do not deploy — see disagreement note) |
| 6 | citation-toll-access-pass | Vintage "Sluice Citation Toll" pass with brass S seal, over classics texts. Edge stub reads malformed "SLUICEDORG". Serif wordmark reads as a deliberate vintage prop, not the product logo. | 5/5 | /ask educational card — small figure (~80%) | Blur the vertical "SLUICEDORG" stub text (baked) | **KEEP_WITH_CROP** |
| 7 | developer-precision-workspace | Keyboard, machined part, calipers on a printed code sheet (small lowercase "sluice" footer), field notes. | 5/5 | /docs Quickstart — figure beside intro (~70%) | none (footer mark is small, unobtrusive) | **KEEP** |
| 8 | treasury-withdrawal-wallet | Lockbox, "SLUICE Release Slip" showing **fake "$250,000.00 Available for Withdrawal"**, leather wallet. | 5/5 | /app/treasury beside the withdrawal explanation (~70%) | Blur the amount block on the slip (baked) | **KEEP_WITH_CROP** |
| 9 | settlement-batching-packet | Case of tiny labeled metal units + consolidated "SETTLEMENT BATCH" envelope in hand. | 5/5 | /app/settlements "How batching works" explainer above the table (~70%) | none ("Q2 2024" is prop-scale) | **KEEP** |
| 10 | creator-payout-routing | Dark table: one glowing source box fanning fiber-light threads to five lit publications. | 5/5 | Landing "Agents paying creators" — faded background (~25%), hidden on small mobile | none | **KEEP_AS_BACKGROUND** |
| 11 | agent-budget-operations | Desk of printed resource cards stamped APPROVED / SKIPPED / SELECTED, handwritten budget-cap notes. | 5/5 | /app/spend intro panel above "Your agents" — split card (~60%) | none (handwritten figures read as props, not UI) | **KEEP** |
| 12 | creator-studio-workspace | Mic, camera, manuscript, notebook, small receipt slip, coffee — a creator's desk. | 5/5 | /app/earn intro panel — split card (~70%) | none (slip text is below legibility at render size) | **KEEP** |
| 13 | paid-citations-research-desk | Night research desk: stacked annotated papers, open book, lamp, city window. No branding. | 5/5 | /ask intro — right-side figure (~55%) with dark gradient | none | **KEEP** |

## Disagreements with the proposed placements

- **secure-personal-access → REJECT** (the brief itself flagged this): the generated logo appears
  on both the phone screen and the card — they are the composition. No crop removes them.
- **creator-earning-moment → not deployed**: the fake payout amount is the image's entire point,
  so masking it guts the image; and /app/earn already carries the studio intro image plus the
  royalty-split figure — a third editorial image breaks the "maximum one dominant image per app
  page" rule and makes the page busier, not clearer. The file is *not* moved to production.
- **settlement-batching-packet**: used on /app/settlements only; the optional /app overview
  duplicate is skipped (the overview keeps its line-art mini-diagrams; mixing a photo into that
  set clashed).
- **physical-payment-rails**: used once (landing settle step). The optional second placement on
  the overview is skipped for the same reason as above. May revisit post-review.

## Production masks baked at move time

- `citation-toll-access-pass.webp` — Gaussian blur over the vertical stub text region.
- `treasury-withdrawal-wallet.webp` — Gaussian blur over the slip's amount block.
