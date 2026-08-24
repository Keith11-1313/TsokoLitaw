# TsokoLitaw — AI Agent Instructions

## 1. Read Before Coding

Read these first:

1. `REQUIREMENTS.md`
2. `ARCHITECTURE.md`
3. `DATABASE.md`
4. `DESIGN.md`
5. `TASKS.md`
6. `README.md`

Inspect relevant existing code and assets before changing UI.

## 2. Current Project Stage

The application is currently in the **UI-only phase**.

Allowed:

- React and Tailwind UI
- mock data
- local component state
- browser-local cart state
- static routes and temporary UI interactions
- local product photography and placeholders

Do not implement unless the user explicitly starts a later phase:

- Supabase
- authentication
- PayMongo
- APIs, webhooks, or database logic
- real CRUD or email
- admin subdomain or DNS configuration

Never make mock UI look like secure authentication, verified payment, or persisted admin data.

## 3. UI References

Files in `references/` are rough early design drafts retained for context. They are not pixel-perfect requirements and must not override newer user decisions or the implemented design system.

Do not use reference PNGs as page images.

Use this priority:

1. Latest user-approved behavior and content
2. Existing shared components and tokens
3. Responsive/accessibility requirements
4. Reference PNGs for broad visual context

## 4. Current Product Decisions

- Currency is PHP.
- Box sizes are 4, 6, and 8 pieces.
- Products use coatings, not flavors or toppings.
- Coatings: Cocoa, Milk, Palitaw, Crushed Nuts, Plain, Sesame Seeds, Cookies and Cream.
- Palitaw means sugar, niyog, and sesame seeds.
- One coating type is included.
- Each additional coating type currently adds ₱5 in mock UI.
- Mixed boxes allocate every piece and must total the selected box size.
- Campus pickup only.
- Browser pricing is never authoritative for future real checkout.

## 5. Navigation Decisions

Customer main navigation:

- Home
- Our Creations
- Journal

Header actions:

- Account/Profile
- Cart with item count

My Orders belongs in the Account/Profile UI and must not be restored to the main navbar.

Journal replaces Vlog and contains announcements, stories, features, community highlights, and optional videos.

Reviews are available only from eligible completed order details. Do not add public Feedback navigation.

Admin stays under `/admin` until subdomain configuration is explicitly authorized.

## 6. Assets

- Use Lucide React for missing simple icons.
- Do not add another icon library without a strong reason.
- Logo: `public/brand/logo.png`.
- Coating photos: `public/images/products/coatings/`.
- Use local placeholders only when a real asset is unavailable.
- Do not add random remote or paid asset dependencies.

## 7. Before Coding

1. Inspect existing files and relevant assets.
2. Identify the smallest affected surface.
3. Understand current component and mock-data flow.
4. Explain the intended change briefly.
5. Identify future schema/security implications when relevant.
6. Preserve unrelated user changes.

## 8. Implementation Rules

- Next.js App Router.
- Strict TypeScript; avoid `any`.
- Prefer Server Components unless interaction requires a Client Component.
- Use Tailwind CSS and existing tokens.
- Reuse existing components before adding variants.
- Mobile-first responsive behavior.
- Semantic HTML, labels, keyboard support, visible focus, and meaningful alt text.
- Avoid unnecessary dependencies and premature abstraction.

## 9. Future Backend Rules

When backend work is explicitly approved:

- Supabase RLS is required.
- Never expose service-role or PayMongo secret keys.
- Admin authorization must be checked server-side.
- Recalculate prices and promotions server-side.
- Validate stock with atomic/transaction-safe operations.
- Preserve historical order snapshots.
- Verify PayMongo webhooks and process them idempotently.
- Never trust redirect parameters or browser payment state.
- Keep order status separate from payment status.
- Restrict customers to their own profiles and orders.

## 10. Order Statuses

Primary flow:

```text
PENDING_PAYMENT
→ PAID
→ CONFIRMED
→ PREPARING
→ READY_FOR_PICKUP
→ COMPLETED
```

Terminal alternatives:

```text
CANCELLED
EXPIRED
```

Future transitions must be validated server-side.

## 11. After Coding

1. Run typecheck.
2. Run lint.
3. Run relevant tests.
4. Run a production build for route or integration-wide changes.
5. Review the diff and check for unrelated changes.
6. Check responsive behavior in proportion to the change.
7. Summarize changed files and unresolved issues.

## 12. Git Handoff

The user performs Git operations manually.

Agents must:

- report whether the requested feature is complete
- report validation results
- provide a concise Conventional Commit message
- recommend modular commit groups when a large batch has accumulated

Agents must not stage, commit, or push.
