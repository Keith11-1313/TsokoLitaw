# Design and interaction maintenance

Use the implemented shared components/tokens and latest approved behavior. `references/` contains
rough historical drafts; do not embed them as pages or restore their obsolete navigation/data.
Inspect the relevant page and assets before editing UI.

## Sources and assets

- Tokens: `src/app/globals.css`. Warm cream background/surfaces, chocolate text/actions, soft borders.
  The typography system uses Neco Regular for reading, true Italic for semantic
  notes, Medium for navigation, and Bold for actions and emphasis. Pally uses Regular for display
  figures, Medium for the brand wordmark, and Bold for headings. Three variable WOFF2 files are
  externally hosted in each environment's public-read Supabase `brand-fonts/v1/` path and are not
  stored in the public repository. Prefer existing Tailwind spacing/token classes.
- Customer navigation uses a sticky floating treatment: separate opaque brand, navigation, and action
  surfaces on tablet/desktop, with the existing compact menu on mobile. It remains in document flow
  before the page hero and does not alter Admin navigation. The surfaces share one height and sit over
  the customer photo background; the customer-header logo mark matches the cart action's 44px circle.
  A small downward scroll keeps navigation visible; continued downward scrolling hides it, and upward
  scrolling reveals it immediately.
- Customer canvas: a plain warm cream surface with a repeating
  `public/images/paper-texture.webp` layer at the shared customer-surface opacity. The texture
  continues through the customer header so the canvas has no flat-color seam. Admin uses a denser
  flat operational background, not a separate brand system.
- Logo: `public/brand/logo.webp`; local Home media: `public/images/home/`.
  Home uses `hero.webp` for the opening collage, `hero-c.webp` for the product-story section, and
  `hero-ss.webp` for the sea-salt pairing. Import the opening hero statically through `next/image`
  so replacing the file produces a hashed optimized asset. Do not append an unconfigured query string
  to a local Image source solely to bypass cache. Keep `hero-c.webp` eager because it can become the
  measured LCP at supported viewport and retained-scroll states; later story media remains lazy.
  The shared missing-media fallback is `public/images/placeholder.webp`; do not add page-specific
  placeholder variants. Coating images: persisted Supabase `catalog-media` URLs. Journal covers:
  `journal-media`.
- Use Lucide for missing simple icons; no new icon/UI library without a concrete need.
- Reuse `CustomerPageShell`, header/footer, `SiteContainer`, buttons, `FormField`, `CustomSelect`,
  number stepper, `StatusBadge`, `AdminPageLayout`, and existing table/card patterns.

## Responsive behavior

Mobile first. Check about 390 px, 768 px, and 1440 px. Keep touch controls around 44 px, readable
line lengths, no page-level overflow, explicit labels, visible focus, and semantic headings/statuses.
Admin uses a mobile drawer and stacked content-heavy cards; truly comparative tables may scroll
inside their own container. Existing grids/container widths take precedence over arbitrary new widths.

Our Creations has one configurator: compact coating choices inside Your coating on mobile and
tablet, with the photo gallery and sticky sidebar from the desktop breakpoint. Single uses native
radio inputs styled as thumbnail options; Mixed uses thumbnail rows with 44px minus/plus controls.
Both presentations share selection, allocation, and pricing state.
Checkout puts its summary before the form on mobile and in a sticky right column on desktop.
Order history uses compact summary cards with full-width actions. Order details show receipt-style
box counts, per-box contents, line totals and always-visible price breakdowns.
My Orders uses the same All/Active/Past buttons on phones and desktop, not a mobile dropdown.
My Orders keeps its Build a box action beside the heading on wider screens. Phones have no
floating action; customers can build a box through Our Creations in the shared navigation.

Home follows a mobile-first product story after the hero: the reason for TsokoLitaw, the live active
coating selection, the three-step website-to-campus pickup journey, the signature sea-salt cream
pairing, the three newest published Journal posts, and one final build-your-box action. The featured
Journal section comes from the persisted Journal source rather than page-local preset media and ends
with a link to the full Journal. Journal posts use optional uploaded cover images. Multi-image review
galleries expose Previous/Next
controls and compact position dots without auto-advancing; a single image has no carousel controls.
Images open in a cream, rounded full-screen viewer with a contained image, compact dot navigation,
close action, and keyboard Escape support. Keep
stable media sizing and reachable keyboard/touch controls. After the cream hero, story sections
alternate white and cream surfaces, beginning with the white About Us section headed "Why we created
TsokoLitaw." At about 390 px the coating cards use two columns and the pickup steps stack; at about 768 px and 1440 px
they use four and three columns respectively. Not Found is a clear global fallback, also used for
non-Admin requests to Admin routes.

## Forms and editors

The footer-only Install app link opens `/install`. Native disclosure guides cover Safari, Chrome,
Brave, Firefox, DuckDuckGo and Opera, with local WebP browser logos and numbered steps. Keep
the headings to logo and browser name; do not add separate device subtitles in the rows or expanded tutorials. Explain home-screen website
access honestly: no APK download or offline ordering is provided. Unsupported menus use Chrome or
Safari as a fallback; do not promise automatic installation or detect installation from a button click.

- Validate in browser for feedback and **again on server/SQL** for authoritative writes.
- Errors appear after blur and update while corrected. Existing-record Save requires valid changed
  values; create/checkout/review/confirm requires valid complete values. Pending actions stay disabled.
- `useFormGate` needs `formRef`, `formProps`, named inputs, and `extraValid` for asynchronous media
  checks. Its baseline is the initial mount: remount an editor when changing records; it does not
  automatically adopt a saved baseline.
- `CustomSelect` uses a hidden native select for form values/constraint validity. Its change event must reach the form gate.
  Menus are anchored below the trigger with a gap, or above the entire labeled control when viewport
  space is limited; do not overlay the trigger/label. `hideLabel` is visual only and retains its accessible name.
  Preserve keyboard arrows, Enter/Space, Escape, outside close, disabled
  options, labels and focus. Hidden native plumbing is not a duplicate visible dropdown.
- The number stepper supports minus/input/plus, direct keyboard entry and arrows. Do not silently
  clamp invalid values into acceptance; maintain bounds/step feedback.
- Inventory forms use one visible label per control. The unusable-piece quantity and note controls
  align at the top on wider screens, with the recording action beneath the field row and aligned to
  the form's left edge.
- Pickup rules use one/two/four columns on phone/tablet/desktop. Admin Customers and Orders keep
  filters in their page header and compact table pagination beneath the results. Rows per page
  applies immediately; navigation is hidden for a single page. See the Admin guide for the different
  server-paged customer directory and bounded loaded-order list.
- Toast notifications align their status icon, message, and dismissal control on one row, use the
  semantic success/error surface, and retain a 44px dismissal target plus automatic dismissal.
- `useEditorDialog` handles focus, scroll locking, Escape and dirty-close confirmation. Route user
  close actions through `requestClose`, pass `pending`, and mount `DiscardChangesDialog` using its
  returned refs/handlers. Successful save may close directly. Discard/stay must not accidentally submit.
- Log out uses the shared confirmation dialog and returns Home only on confirmation.
- Manual checkout presents payment methods as themed icon cards rather than visible browser radio
  circles. The native radio controls remain available to assistive technology and keyboard users;
  selection is shown through the card border, background, and explicit screen-reader text. Icons are
  unframed so the compact cards do not contain redundant circles or reserved empty height.
- Image preview is not persisted publication. Browser and server decode JPG/PNG/WebP ≤3 MiB;
  coatings must be square; Journal covers and optional review images need not be. Journal covers use
  an Admin-selected persisted landscape 16:9, square 1:1, or portrait 4:5 frame and `contain`, never
  an automatic crop. Portrait media remains full-width on phones and is centered and bounded on full
  post pages at larger breakpoints. Public Journal cards stay stacked on phones and become full-width
  editorial rows on wider screens. Square and portrait covers place media beside the copy; landscape
  covers place copy before media. Each card keeps one separated bottom action row, readable body text,
  and its natural height rather than stretching to another card. Every format uses a bounded preview
  of the available post body beneath the excerpt instead of leaving the content side mostly empty.
  Posts without an excerpt show a longer body preview in that space, rather than repeating a short
  fallback summary.
  On desktop, titles, summaries, and body previews are clamped by format so the media determines the
  editorial row height; the action remains visible and copy cannot create empty space below the image.
  Review images stay
  private until the review is published by an Admin. Do not crop/transform automatically.
- The global Not Found page uses the local transparent empty-box illustration, a direct recovery
  message, and Home/Orders actions. Keep it centered, responsive, and free of unrelated navigation
  so people can recover quickly from invalid customer routes.
- The customer FAQ is linked from the Footer only. Its grouped native disclosure controls remain
  keyboard-operable, clearly focused, readable without client-side JavaScript, and cover ordering,
  pickup, payments, rewards, reviews, product care, accounts, and support.
- Admin image fields reuse `ImageUploadField` for the same accessible drag-and-drop presentation.
  Keep file-specific validation beside the field and preview a valid local selection before Save;
  the preview does not imply that the upload has persisted. The generic incomplete-form message
  remains available to assistive technology without repeating visible instructions above every
  action row.

Contract tests: `src/hooks/editor-contracts.test.tsx`, form and image validation tests. See
[testing](../maintenance/testing.md) for manual keyboard/responsive checks.

## Loading and generated Boneyard files

The root layout has a shared Suspense boundary using `AppLoadingSkeleton` for the initial load.
Its environment-hosted `@font-face` rules are deterministic. Hydration suppression is scoped to the
document head and that font style because extensions may inject their own head style before React
hydrates; do not extend suppression into the application body to conceal an actual render mismatch.
Admin has a route loading skeleton and error boundary because its authorized operational aggregates
may take longer or reject an incomplete database contract. Customer navigation keeps the current
page visible until the destination is ready. Customer header links (including Account and Cart) use Next.js `useLinkStatus`
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
