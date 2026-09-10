# Design and interaction maintenance

Use the implemented shared components/tokens and latest approved behavior. `references/` contains
rough historical drafts; do not embed them as pages or restore their obsolete navigation/data.
Inspect the relevant page and assets before editing UI.

## Sources and assets

- Tokens: `src/app/globals.css`. Warm cream background/surfaces, chocolate text/actions, soft borders.
  Body font Lato; display font DM Serif Display. Prefer existing Tailwind spacing/token classes.
- Customer navigation uses a sticky floating treatment: separate opaque brand, navigation, and action
  surfaces on tablet/desktop, with the existing compact menu on mobile. It remains in document flow
  before the page hero and does not alter Admin navigation. The surfaces share one height and sit over
  the customer photo background; the customer-header logo mark matches the cart action's 44px circle.
  A small downward scroll keeps navigation visible; continued downward scrolling hides it, and upward
  scrolling reveals it immediately.
- Customer canvas: `public/images/photo-bg.png`; opaque cream cards/navigation preserve readability.
  Admin uses a denser flat operational background, not a separate brand system.
- Logo: `public/brand/logo.png`; local Home media: `public/images/home/`, `public/videos/home/`.
  Coating images: persisted Supabase `catalog-media` URLs. Journal covers: `journal-media`.
- Use Lucide for missing simple icons; no new icon/UI library without a concrete need.
- Reuse `CustomerPageShell`, header/footer, `SiteContainer`, buttons, `FormField`, `CustomSelect`,
  number stepper, `StatusBadge`, `AdminPageLayout`, and existing table/card patterns.

## Responsive behavior

Mobile first. Check about 390 px, 768 px, and 1440 px. Keep touch controls around 44 px, readable
line lengths, no page-level overflow, explicit labels, visible focus, and semantic headings/statuses.
Admin uses a mobile drawer and stacked content-heavy cards; truly comparative tables may scroll
inside their own container. Existing grids/container widths take precedence over arbitrary new widths.

Our Creations has one configurator: mobile before coating gallery, desktop sticky sidebar. The
mobile return-to-builder shortcut scrolls to that same stateful form rather than duplicating it.
Checkout puts its summary before the form on mobile and in a sticky right column on desktop.
Order history/detail share receipt-style box counts, per-box contents, line totals and optional breakdowns.

Home uses supplied media; the video starts muted/inline with sound controls and advances to the
promotional image. Keep stable media sizing and reachable keyboard/touch controls. Not Found is
a clear global fallback, also used for non-Admin requests to Admin routes.

## Forms and editors

- Validate in browser for feedback and **again on server/SQL** for authoritative writes.
- Errors appear after blur and update while corrected. Existing-record Save requires valid changed
  values; create/checkout/review/confirm requires valid complete values. Pending actions stay disabled.
- `useFormGate` needs `formRef`, `formProps`, named inputs, and `extraValid` for asynchronous media
  checks. Its baseline is the initial mount: remount an editor when changing records; it does not
  automatically adopt a saved baseline.
- `CustomSelect` uses a hidden native select for form values/constraint validity. Its change event
  must reach the form gate. Preserve keyboard arrows, Enter/Space, Escape, outside close, disabled
  options, labels and focus. Hidden native plumbing is not a duplicate visible dropdown.
- The number stepper supports minus/input/plus, direct keyboard entry and arrows. Do not silently
  clamp invalid values into acceptance; maintain bounds/step feedback.
- `useEditorDialog` handles focus, scroll locking, Escape and dirty-close confirmation. Route user
  close actions through `requestClose`, pass `pending`, and mount `DiscardChangesDialog` using its
  returned refs/handlers. Successful save may close directly. Discard/stay must not accidentally submit.
- Log out uses the shared confirmation dialog and returns Home only on confirmation.
- Image preview is not persisted publication. Browser and server decode JPG/PNG/WebP ≤3 MiB;
  coatings must be square, Journal covers need not be. Do not crop/transform automatically.

Contract tests: `src/hooks/editor-contracts.test.tsx`, form and image validation tests. See
[testing](../maintenance/testing.md) for manual keyboard/responsive checks.

## Loading and generated Boneyard files

The root layout has a shared Suspense boundary using `AppLoadingSkeleton` for the initial load.
There is no route `loading.tsx`: client navigation keeps the current page visible until the
destination is ready. Customer header links (including Account and Cart) use Next.js `useLinkStatus`
to give the clicked link a pressed, gray appearance and disable repeat activation while pending.
Its label and dimensions stay unchanged; there is no underline, spinner, or loading text.
The root layout still imports the generated bones registry for the initial fallback.

Keep generated `src/bones/` output separate from the manually maintained fixture/layout. After
changing the fixture with the dev server on port 3000:

```powershell
npm run skeleton:build
```

Capture only `/boneyard-preview`, never authenticated/customer data. Preview is unavailable in
production. Do not remove Boneyard or hand-edit bones just because generated files are large.

## Honest states

Provide loading, empty, unavailable/sold-out, validation error, failure, pending and success states.
Do not show “paid” from redirect parameters or “saved” after an unsuccessful mutation. Paid orders
have no online cancellation/refund controls. Reviews originate from completed orders. Unconnected
controls must be disabled or explicitly unavailable; connected Admin pages need not repeat old
prototype purpose/connection banners when the operation is clear.

Profile deletion explicitly explains the 90-day grace and retained external Google account.
Customer receipt/email wording must preserve immutable quantities, prices and pickup information.
New policy wording needs product approval; visual cleanup is not permission to change business rules.
