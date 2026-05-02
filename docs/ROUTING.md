# Routing

| URL              | Route group  | Auth                 | Notes                                        |
| ---------------- | ------------ | -------------------- | -------------------------------------------- |
| `/`              | root         | Public               | Landing page                                 |
| `/login`         | `(auth)`     | Public               | Redirects logged-in users to `/dashboard`    |
| `/new`           | `(intake)`   | Public               | Claimant intake                              |
| `/dashboard`     | `(adjuster)` | Required             | Protected by middleware                      |
| `/claim/[id]`    | `(adjuster)` | Required             | Protected by middleware                      |
| `/questions`     | `(adjuster)` | Required             | Protected by middleware                      |
| `/design-system` | root         | Public               | Public for POC; remove before customer demo  |
| `/api/*`         | API          | No cookie middleware | Inngest and future webhooks use signing keys |
| `not-found`      | root         | Public               | Next.js 404                                  |

Auth behavior is implemented in [middleware.ts](../middleware.ts) and [lib/auth](../lib/auth/).
