# TsokoLitaw maintainer guide

One campus-pickup storefront, one Next.js application, and two isolated environments.
Start with [onboarding](getting-started/onboarding.md). Read only the guides relevant to your change.

## Find your task

| Question                                     | Guide                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| How do I run it?                             | [Local setup](getting-started/local-setup.md)                                                |
| Am I touching Dev or Production?             | [Environments](getting-started/environments.md)                                              |
| How does the application fit together?       | [Overview](architecture/overview.md), [project map](architecture/project-map.md)             |
| What belongs in the browser, server, or SQL? | [Boundaries](architecture/client-server-boundaries.md), [database](architecture/database.md) |
| Where do I change a feature?                 | [Common changes](maintenance/common-changes.md)                                              |
| What could this break?                       | [Change safety](maintenance/change-safety.md), [testing](maintenance/testing.md)             |
| How does it reach Production?                | [Deployment](operations/deployment.md), [migrations](operations/database-migrations.md)      |
| Why is a background job or callback failing? | [Webhooks](operations/webhooks.md), [troubleshooting](operations/troubleshooting.md)         |

## Feature paths

[Authentication](features/authentication.md) · [Catalog](features/catalog.md) ·
[Checkout](features/checkout.md) · [Pickup and inventory](features/inventory.md) ·
[Orders and reviews](features/orders.md) · [Payments](features/payments.md) ·
[Loyalty](features/loyalty.md) · [Notifications](features/notifications.md) · [Admin and Journal](features/admin.md)

## Product and UI

- [Current product rules and decision rationale](product/decisions.md)
- [Design and shared form contracts](ui/design.md)
- [Roadmap: current UI work, planned APK, optional analytics](roadmap.md)

These guides replace the former root specifications, onboarding document, and completed phase checklists.
Historical versions remain in Git; they are not instructions to replay old migrations or reset hosted data.
Applied SQL plus later migrations define the schema, not a copied Markdown table definition.
Update the affected guide when behavior changes; do not duplicate the whole system specification in README.
