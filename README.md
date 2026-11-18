# Verdant

Fertilizer company website with an owner-only content dashboard at `/admin`.

- Products and blog posts use D1. Only published records render on the website.
- Image uploads use R2 and accept JPG, PNG, and WebP files up to 5 MB.
- Sites owns sign-in. The server checks the authenticated identity on every admin operation.
- `ADMIN_BOOTSTRAP_EMAIL` provisions the site owner's stable user ID once; later checks use the pinned ID in D1, not the email address. This secret is configured in Sites, never in browser code.
- Mutations require a same-origin request and reject stale revisions.
- The contact area still downloads an inquiry; it does not send email.

## Development

Use the Sites runtime helpers for installation, preview, build, and deployment. Run `npm run db:generate` for schema changes and apply generated SQL to local D1 before previewing.

Checks: `npx tsc --noEmit` and `node tests/cms.test.mjs`.

Local test databases are independent of production. The initial three sample products are seeded once. Deleting them does not recreate them.
