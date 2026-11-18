# Verdant

Fertilizer company website with an owner-only content dashboard at `/admin`.

## Vercel deployment

This branch runs on Next.js and Vercel. Connect a **private Vercel Blob store** to the project. It stores product/blog records, uploaded images, and a salted scrypt admin password hash. Conditional ETag writes prevent lost updates. Draft records and unused images are not publicly accessible.

Configure server-only `ADMIN_SESSION_SECRET` and `ADMIN_SETUP_TOKEN` as independent random 32-byte secrets. Never commit their values. Open `/admin/login#setup=<ADMIN_SETUP_TOKEN>` privately once to choose a password of at least 12 characters. After creation, the setup token cannot create another account. Sessions last eight hours. Five failed sign-ins lock login for 15 minutes. Keep the setup link private. Changing the session secret revokes sessions.

The public website has product browsing, field notes, and an inquiry download. The admin supports product/blog create, edit, delete, drafts, publishing, and JPG/PNG/WebP uploads up to 4 MB (within Vercel request limits).

The original Sites/Cloudflare deployment remains separate. Existing D1/R2 production records are not automatically copied to Vercel. A fresh store begins with three sample products and no blog posts. Deleting the samples does not recreate them.

## Development

Node.js 22+: `npm ci`, `npm run dev`, `npm run build`.

Use Vercel's environment integration for storage credentials. Never use filesystem or in-memory storage for production content.
