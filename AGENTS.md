# TsokoLitaw — AI Agent Instructions

## 1. Read Before Coding

Read these first:

1. `REQUIREMENTS.md`
2. `ARCHITECTURE.md`
3. `DATABASE.md`
4. `DESIGN.md`
5. `TASKS.md`
6. `README.md`

Inspect `/references` before implementing UI.

---

## 2. Current UI Reference Rules

Reference PNGs are the visual source of truth.

Expected:

```text
references/customer-home.png
references/customer-our-creations.png
references/customer-orders.png
references/customer-feedback.png
references/admin-dashboard.png
references/admin-order-management.png
```

Do not use them as actual page images.

Recreate them using real UI code.

---

## 3. Missing Assets

The project currently has no finalized asset library.

For simple icons:

- use Lucide React unless the project already uses another consistent icon library

For product images:

- use temporary local placeholders during UI development

Do not add paid assets or random external image dependencies.

Do not add multiple icon libraries unless there is a strong reason.

---

## 4. Before Coding

1. Inspect existing files.
2. Identify affected files.
3. Inspect relevant reference images.
4. Understand current data flow.
5. Explain the smallest reasonable implementation.
6. Identify schema/security implications.
7. Avoid unrelated changes.

---

## 5. After Coding

1. Run type checking.
2. Run linting.
3. Run relevant tests.
4. Review diff.
5. Check for unrelated changes.
6. Summarize changed files.
7. Mention unresolved issues.

---

## 6. Scope

- Do not implement unrelated features.
- Do not rewrite working code unnecessarily.
- Do not add dependencies casually.
- Prefer simple maintainable solutions.
- Avoid premature abstraction.

---

## 7. TypeScript

- strict TypeScript
- avoid `any`
- use explicit domain types
- runtime validation where needed

---

## 8. Next.js

- App Router
- prefer Server Components
- Client Components only when interaction requires them
- keep secrets server-side

---

## 9. Supabase

- use RLS
- never expose service-role key
- customer data must be scoped
- admin authorization must be server-side
- prefer migrations for schema changes

---

## 10. PayMongo

Never:

- hardcode secret keys
- log secret keys
- commit `.env.local`
- mark payment successful from browser state
- trust redirect query parameters

Always:

- verify server-side
- verify webhooks
- process webhooks idempotently
- keep order status separate from payment status

---

## 11. Pricing

- browser is not authoritative
- recalculate server-side
- use database prices
- preserve order snapshots
- validate promotions server-side

---

## 12. Inventory

- avoid overselling
- reserve stock safely
- release expired reservations
- use atomic/transaction-safe database logic

---

## 13. Authentication

- Google Sign-In through Supabase
- one admin role
- no frontend-only authorization

---

## 14. UI

For supplied reference pages:

- match visual design closely
- preserve hierarchy
- preserve spacing
- preserve typography feel
- preserve card/button/form language
- build responsive layout

For missing pages:

- extend existing customer/admin design system
- do not invent a separate visual language

---

## 15. Admin Settings

Editable operational data may include:

- prices
- toppings
- add-ons
- stock
- pickup dates
- pickup locations
- promotions
- loyalty
- support email

Never expose infrastructure secrets.

---

## 16. Testing Priorities

Test:

- price calculation
- free topping rule
- extra topping pricing
- stock reservation/release
- payment expiry
- promotions
- loyalty
- order transitions
- cancellation eligibility
- unauthorized order access
- admin authorization
- webhook idempotency

---

## 17. Status Transitions

Primary:

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

Validate server-side.

---

## 18. Definition of Done

A task is complete when:

- requested scope is implemented
- TypeScript passes
- lint passes
- relevant tests pass
- security implications reviewed
- responsive behavior checked
- documentation updated if needed

---

## 19. Git Handoff

After completing and validating approved implementation work:

1. Review `git status` and the final diff.
2. Report whether the entire requested feature is finished.
3. Report validation results and any unresolved issues.
4. Provide a concise suggested Git commit message that describes the completed scope.

Do not stage, commit, or push changes. The user handles all Git operations manually in the terminal.
