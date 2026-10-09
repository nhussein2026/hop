# Hop Security

Hop holds one person's private data and is meant to be reachable only from that person's devices. Security is designed around that: one password, a private network, and no external services.

## Threat Model

**In scope:**

- Someone on the same network, or anyone if Hop is accidentally exposed, trying to sign in or claim the setup screen.
- Other websites trying to make the browser send requests to Hop (CSRF).
- Uploaded files being used to run script in Hop's origin.
- A lost or shared device that is still signed in.

**Out of scope:** an attacker with shell access to the server, which can read the database file directly. Protect the server itself with disk encryption, SSH keys, and updates.

## Authentication

- **One password**, at least 12 characters, hashed with **scrypt** and a random salt in the `credentials` table. Comparison is timing-safe.
- **First-run setup** is only possible while no password exists. Hop **refuses to start on a non-local `HOST`** until a password is set, so no one else on the network can reach the setup screen first. With `tailscale serve`, Hop keeps listening on `127.0.0.1` and this guard always holds.
- **Rate limiting:** after 5 wrong passwords, sign-in and password changes are blocked for 15 minutes and return `429` with `Retry-After`. The limit is kept in memory per client address. Behind a local proxy like `tailscale serve`, every client shares one address, so the limit becomes global, which is fine for one user.
- **Reset:** `yarn workspace @hop/api auth:reset` (run on the server with Hop stopped) removes the password and all sessions. Data is untouched.

## Sessions

- A random token is set in the `hop_session` cookie: `HttpOnly`, `SameSite=Strict`, `Path=/`, plus `Secure` when `COOKIE_SECURE=true`.
- The database stores only a **SHA-256 hash** of each token, so a copy of the database can't be used to sign in.
- Sessions last **30 days**. Each records its user agent and last activity, shown in **Settings → Privacy and security**, where any device can be signed out.
- Changing the password signs out every other device.

## Requests

- Every route except `/api/health` and `/api/auth/*` requires a session.
- Non-`GET` requests whose `Origin` doesn't match the host (or the `X-Forwarded-Host` a proxy sets) are rejected with `403`. Together with `SameSite=Strict`, this blocks cross-site writes.
- Every body is validated with a strict Zod schema; unknown fields are rejected. Bodies are capped at 1 MB (200 MB for restores).
- Errors never include stack traces or internal details.

## Web App and Files

- The built app is served with a strict **Content-Security-Policy** (`default-src 'self'`) and `X-Content-Type-Options: nosniff`.
- Uploaded files are served with `Content-Security-Policy: sandbox`, `nosniff`, and `Cache-Control: private, no-store`. Only PDFs (and images, for library files) open inline; everything else downloads.
- The service worker caches API responses for offline reading and deletes them on sign-out or any `401`.

## Data at Rest

- The database and backups are plain files under `storage/` (or wherever `DATABASE_URL` and `BACKUP_DIR` point). They are **not encrypted by Hop**; rely on full-disk encryption on the server.
- `.env`, `*.db` files, and `storage/backups/` are ignored by Git. Never commit them.
- Backups exclude the password and sessions.

## Deployment Checklist

- [ ] Hop is reachable only over HTTPS on a private network (Tailscale), not on the public internet.
- [ ] `COOKIE_SECURE=true`.
- [ ] `HOST=127.0.0.1` behind `tailscale serve`, or a private address only.
- [ ] Password set before Hop is reachable from other devices.
- [ ] Server disk encrypted; backups copied to a second location.
- [ ] Old devices signed out in **Settings → Privacy and security**.
