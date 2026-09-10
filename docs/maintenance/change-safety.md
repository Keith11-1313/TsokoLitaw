# Change safety map

Classification depends on behavior, not just directory. A “copy-only” edit that changes a policy or
claims payment succeeded is not low risk. Preserve the server/database safeguards in every category.

| Level                   | Typical areas                                                                                              | Why / required attention                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| SAFE (usually low risk) | Styling, ordinary copy, presentational layout, isolated visual components                                  | Still check responsive layout, semantics, keyboard access, and truthful labels                                |
| CAUTION                 | Shared cart/application state, server actions, Admin mutations, catalog/order behavior, business utilities | Shared consumers and persisted state can drift; trace action/server/RPC, validate input and run feature tests |
| CRITICAL                | Auth, authorization, RLS                                                                                   | A small mistake can disclose another customer's data or permit privileged writes                              |
| CRITICAL                | Server pricing, PayMongo, signed webhooks, payment transitions                                             | Incorrect trust/idempotency can create wrong totals, fake paid orders, or duplicate processing                |
| CRITICAL                | Inventory/reward concurrency and database transactions                                                     | Separate reads/updates can oversell or spend one reward twice                                                 |
| CRITICAL                | Migrations, grants, constraints, snapshot changes                                                          | Deployed code compatibility, data retention, and rollback must be reviewed before applying                    |
| CRITICAL                | Rate limits, idempotency and retry claims                                                                  | Removing them makes duplicate/replayed/concurrent operations unsafe across instances                          |
| CRITICAL                | Dev/Production variables, URLs, callbacks and secrets                                                      | A working Dev UI can accidentally write Production or initiate a live provider operation                      |

## Before changing a critical area

1. Identify the owner, authoritative source, external systems and latest SQL definition.
2. State the invariant being preserved. Check failure, duplicate, and concurrent cases, not only success.
3. Keep service-role secrets out of browser code; recheck actor/ownership in mutations.
4. Keep transaction-sensitive work in SQL and provider calls outside long-held locks.
5. Use [local tests](testing.md), Dev validation, and a reviewed [deployment plan](../operations/deployment.md).

No hosted reset, provider live charge/key change, expanded email event set, new Admin responsibility,
or DNS/host expansion is implied by a cleanup request. Obtain the required explicit approval.
