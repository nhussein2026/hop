# Deploying Hop

Hop is built for one person using it from a few trusted devices. The recommended setup is an **always-on machine** running Hop, reachable **only through Tailscale** over HTTPS.

The repository does not include container or service-manager files yet. This guide covers what Hop supports today.

## Where to Run It

Hop needs a machine that stays on and has a persistent disk for the SQLite file. Serverless hosts (Vercel, Netlify, Cloudflare Pages) and free tiers with ephemeral disks or sleeping instances won't work.

| Option | Notes |
| --- | --- |
| **Small VPS + Tailscale** (recommended) | Always on, no hardware to look after, private. A 1–2 GB instance is plenty. |
| Home mini PC or Raspberry Pi + Tailscale | No monthly cost, but depends on home power and internet. |
| Laptop | Fine for trying Hop. Not for daily use: other devices lose Hop whenever the laptop sleeps. |

## Steps

### 1. Install and build

On the server, with Node.js 22.13+ and Yarn 4:

```bash
git clone <repo> hop && cd hop
yarn install
cp .env.example .env
yarn build
```

### 2. Configure `.env`

```bash
PORT=4321
HOST=127.0.0.1
DATABASE_URL=./storage/hop.db
BACKUP_DIR=./storage/backups
COOKIE_SECURE=true
```

Keep `HOST=127.0.0.1`: Tailscale connects to Hop locally, so Hop never listens on a network interface.

### 3. Set the password

Hop only accepts first-time setup from the machine itself. From your laptop, open an SSH tunnel and finish setup in your browser:

```bash
ssh -L 4321:127.0.0.1:4321 <server>     # then on the server: yarn start
# open http://localhost:4321 on your laptop and create the password
```

### 4. Keep Hop running

Run `yarn start` under a process manager so it restarts on crashes and reboots, for example a systemd service with `WorkingDirectory` set to the repository and `ExecStart` running `yarn start`.

### 5. Serve it over HTTPS with Tailscale

```bash
sudo tailscale up
sudo tailscale serve --bg 4321
```

Hop is now at `https://<machine>.<tailnet>.ts.net`, reachable only from devices signed in to your tailnet. See `tailscale serve --help` for your version's exact syntax.

### 6. Install on your devices

Install the Tailscale app on your phone, tablet, and laptop, then open the `ts.net` address:

- **Android / Chrome:** menu → **Install app**
- **iOS / iPadOS Safari:** **Share → Add to Home Screen**
- **Desktop Chrome / Edge:** the install icon in the address bar

### 7. Back up off the server

Hop's automatic backups live on the same disk as the database. Copy them somewhere else, for example a nightly `rsync` or `rclone` of `storage/backups/` to another machine or object storage. Use **Settings → Backup and export → Test a restore** now and then to confirm the latest backup works.

## Updating

```bash
git pull
yarn install
yarn build
# restart the service
```

Migrations run automatically on startup in one transaction. Before updating, use **Back up now** (or download an export), since the automatic backup only runs once a day.

## Moving to a New Server

1. On the old server, **Back up now**, then download the backup (or copy `storage/backups/`).
2. Set up the new server through step 3 above.
3. **Settings → Backup and export → Restore** from the downloaded file.

Or stop Hop and copy `storage/hop.db` (plus `-wal` and `-shm`, if present) directly.

## Known Limitations

- An open app on one device doesn't see changes from another device until it reloads.
- The first offline start on a new day can fail to load data. See [Architecture → Known Limitations](ARCHITECTURE.md#known-limitations).
