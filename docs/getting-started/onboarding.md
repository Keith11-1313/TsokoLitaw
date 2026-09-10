# Your first maintenance task

TsokoLitaw sells configurable dessert boxes for campus pickup. Customers sign in with Google,
choose boxes, pay through QR Ph, and track their orders. Admin publishes catalog/pickup options
and manages fulfillment. This is an existing production application, not a prototype.

1. Read [environment isolation](environments.md) before obtaining credentials.
2. Follow [local setup](local-setup.md); use hosted Dev for ordinary UI work, disposable local Supabase for SQL tests.
3. Open Home, Our Creations, and Journal. With an authorized Dev identity, check Profile and My Orders.
   Admin access requires an approved active Admin profile; do not bypass it for testing.
4. Pick a feature in the [project map](../architecture/project-map.md). Follow its page into the component,
   action, server module, and RPC rather than reading every file.
5. Read [change safety](../maintenance/change-safety.md), make a small change, and run its
   [tests](../maintenance/testing.md). Check responsive/keyboard behavior for UI changes.
6. Review the diff and the Dev deployment before the user promotes it through one PR to `main`.
   SQL promotion is separate from Git and Vercel.

## Trace one order

Read [checkout](../features/checkout.md) once. The key boundary is:
browser estimates → authenticated action → live server repricing → transactional PostgreSQL writer
→ PayMongo → signed webhook → committed order state → email.

SQL protects inventory, reward usage, and concurrent state transitions. Do not replace it with
browser arithmetic or a sequence of application-side reads and updates.

## Working habits

- Use named `server-<feature>.ts` modules to locate server data operations. A separate service/repository layer is unnecessary.
- Inspect existing controls before making a new one. [Form contracts](../ui/design.md#forms-and-editors) matter for dirty-save and modal behavior.
- Generated database types and Boneyard bones are regenerated, not hand-edited.
- Do not use production credentials, send real payment charges, or run hosted resets to learn the system.
- Commit/push/merge are performed by the user, not an agent. See [deployment](../operations/deployment.md).
