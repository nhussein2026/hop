# Deploying Hop

Hop is built for one person using it from a few trusted devices. The recommended setup is a **small always-on server** running Hop, reachable **only through Tailscale** over HTTPS, with an **encrypted off-site copy** of the data.

```text
Phone, tablet, lab PC ── Tailscale (private, encrypted) ── Hetzner server
                                                            ├── tailscale serve  (HTTPS)
                                                            ├── Hop              (Node, 127.0.0.1:4321)
                                                            ├── storage/hop.db   (all data, files included)
                                                            └── storage/backups  (daily JSON) ── restic ── Backblaze B2
```

The files this guide installs are in [`deploy/`](../deploy).

## Where to Run It

Hop needs a machine that stays on and has a persistent disk for the SQLite file. Serverless hosts (Vercel, Netlify, Cloudflare Pages) and free tiers with ephemeral disks or sleeping instances won't work.

| Option | Notes |
| --- | --- |
| **Small VPS + Tailscale** (recommended) | Always on, no hardware to look after, private. This guide uses Hetzner Cloud. |
| Home mini PC or old laptop + Tailscale | No monthly cost, but depends on home power and internet. The steps below work the same from step 3. |
| Your own laptop + Tailscale | Free. While the laptop is off or asleep, your other devices show what they loaded last but can't save changes. See [Run It on Your Own Laptop](#run-it-on-your-own-laptop). |

Hop needs little: two years of heavy use is about 3 MB of data, and the server process uses about 150–300 MB of memory.

## Before You Start

- **Hetzner account** at [hetzner.com](https://www.hetzner.com). New accounts may be asked for an ID check. Use your real name and address exactly as on your ID, and don't use a VPN while signing up. Payment is by card or PayPal.
- **Tailscale account** at [tailscale.com](https://tailscale.com) (free Personal plan).
- **Backblaze B2 account** at [backblaze.com](https://www.backblaze.com) for off-site backups (the first 10 GB are free). Choose the **EU Central** region when signing up.
- **An SSH key** on your laptop. If you don't have one: `ssh-keygen -t ed25519`.

## Steps

### 1. Create the server

In the Hetzner Cloud Console, create a project, then **Add Server**:

| Setting | Choose |
| --- | --- |
| Location | Nuremberg or Falkenstein (closest to Istanbul) |
| Image | Ubuntu 24.04 |
| Type | **CX23** (x86, 2 vCPU, 4 GB) if it's offered, otherwise **CAX11** (Arm, same size). Both work. |
| Networking | Public IPv4 and IPv6. Keep IPv4: GitHub has no IPv6. |
| SSH keys | Add the public key from your laptop (`~/.ssh/id_ed25519.pub`). |
| Firewalls | Create one named `hop` with a single inbound rule: TCP 22 from your current IP. You'll remove it in step 3. |
| Backups | Optional (+20%). The off-site backup in step 7 is the one that matters. |
| Name | `hop` |

After it's created, turn on **Protection** (delete protection) for the server.

### 2. Prepare the server

```bash
ssh root@<server-ip>

apt update && apt full-upgrade -y
timedatectl set-timezone Europe/Istanbul
apt install -y git sqlite3 restic

# Node.js 24 LTS
curl -fsSL https://deb.nodesource.com/setup_24.x -o nodesource_setup.sh
bash nodesource_setup.sh
apt install -y nodejs
corepack enable

# The account Hop runs as
adduser --disabled-password --gecos "" hop
install -d -o hop -g hop /opt/hop
install -d -m 750 -o root -g hop /etc/hop
```

Ubuntu installs security updates automatically (`unattended-upgrades`).

### 3. Join your tailnet

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --hostname hop
```

Open the link it prints and approve the server. Then, in the Tailscale admin console:

1. **Machines → hop → Disable key expiry.** Otherwise the server drops off your tailnet after 180 days.
2. **DNS:** turn on **MagicDNS**, then **HTTPS Certificates**.

Check you can reach the server through Tailscale from your laptop (with Tailscale running there): `ssh root@hop`. Once that works, **delete the SSH rule from the Hetzner firewall**. The server then accepts no connections from the internet at all; you reach it only through Tailscale. If you ever lock yourself out, the Hetzner Console has a browser-based console.

### 4. Install Hop

```bash
sudo -iu hop
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
git clone https://github.com/nhussein2026/hop.git /opt/hop
cd /opt/hop
yarn install
yarn build
exit
```

Then, as root, add the settings and the service:

```bash
# The service may only write here, and systemd won't start it if the folder is missing.
install -d -o hop -g hop /opt/hop/storage
install -m 640 -o root -g hop /opt/hop/deploy/hop.env.example /etc/hop/hop.env
cp /opt/hop/deploy/hop.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now hop

systemctl status hop --no-pager
curl http://127.0.0.1:4321/api/health
```

Hop reads its settings from `/etc/hop/hop.env`, not from a `.env` file in the repository.

### 5. Set the password

Do this **before** step 6, so nobody else can reach the setup screen first. From your laptop, open a tunnel and finish setup in your browser:

```bash
ssh -L 4321:127.0.0.1:4321 root@hop
# then open http://localhost:4321 on your laptop and create the password
```

### 6. Serve it over HTTPS

```bash
tailscale serve --bg 4321
```

Hop is now at `https://hop.<your-tailnet>.ts.net`, reachable only from devices signed in to your tailnet. The address is shown by `tailscale serve status`.

### 7. Back up off the server

Hop's daily backups live on the same disk as the database. This step adds an encrypted nightly copy on Backblaze B2.

1. In Backblaze, create a **private** bucket (e.g. `hop-backup-<something-unique>`), then an **application key** limited to that bucket. Note the key ID, the key, and the bucket's S3 endpoint.
2. On the server, as root:

   ```bash
   install -m 640 -o root -g hop /opt/hop/deploy/restic.env.example /etc/hop/restic.env
   nano /etc/hop/restic.env        # fill in the endpoint, bucket, key ID and key

   openssl rand -base64 32 > /etc/hop/restic-password
   chown root:hop /etc/hop/restic-password && chmod 640 /etc/hop/restic-password
   cat /etc/hop/restic-password    # save this in your password manager now

   sudo -u hop bash -c 'set -a; . /etc/hop/restic.env; restic init'

   cp /opt/hop/deploy/hop-offsite-backup.{service,timer} /etc/systemd/system/
   systemctl daemon-reload
   systemctl enable --now hop-offsite-backup.timer
   systemctl start hop-offsite-backup.service
   journalctl -u hop-offsite-backup -n 20 --no-pager
   ```

3. Confirm the copy exists: `sudo -u hop bash -c 'set -a; . /etc/hop/restic.env; restic snapshots'`.

The backup runs every night at about 03:30. **Without the restic password the backups can't be read**, so keep it somewhere other than the server.

### 8. Install on your devices

Install the Tailscale app and sign in, then open the `ts.net` address:

- **Android / Chrome:** menu → **Install app**. In Android's VPN settings, set Tailscale as **Always-on VPN** so the app can always reach Hop.
- **iOS / iPadOS Safari:** **Share → Add to Home Screen**. In the Tailscale app, turn on **VPN On Demand**.
- **Desktop Chrome / Edge:** the install icon in the address bar.

Finally, run **Settings → Backup and export → Test a restore** once to confirm the backups work.

## Run It on Your Own Laptop

The laptop is the server while it's on. While it's off or asleep, your phone and tablet open Hop from what they loaded last, with a banner saying the server can't be reached, and changes are refused with a clear message. When the laptop is back, every device reloads its data by itself within about 15 seconds.

The real Hop runs as its own `hop` account from `/opt/hop`, on port 4400, with its own database. Your development setup (`yarn dev` on port 4321, `storage/hop.db` in your checkout) can't touch it.

1. **Install the tools and Tailscale:**

   ```bash
   sudo apt install -y git sqlite3 restic
   node --version        # needs 22.13 or newer
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up --hostname hop
   ```

   In the Tailscale admin console: **Machines → hop → Disable key expiry**, and under **DNS** turn on **MagicDNS** and **HTTPS Certificates**.

2. **Create the `hop` account and install Hop.** A system account doesn't appear on the login screen.

   ```bash
   sudo adduser --system --group --home /var/lib/hop --shell /bin/bash hop
   sudo install -d -o hop -g hop /opt/hop
   sudo install -d -m 750 -o root -g hop /etc/hop

   sudo -u hop -H bash -c 'export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
     git clone https://github.com/nhussein2026/hop.git /opt/hop
     cd /opt/hop && yarn install && yarn build'
   ```

3. **Settings and the service.** Port 4400 keeps clear of `yarn dev`.

   ```bash
   sudo install -d -o hop -g hop /opt/hop/storage
   sudo install -m 640 -o root -g hop /opt/hop/deploy/hop.env.example /etc/hop/hop.env
   sudo sed -i 's/^PORT=.*/PORT=4400/' /etc/hop/hop.env
   sudo cp /opt/hop/deploy/hop.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now hop
   curl http://127.0.0.1:4400/api/health
   ```

4. **Set the password** on the laptop itself: open <http://localhost:4400> and create it. Do this before the next step.

5. **Serve it over HTTPS:** `sudo tailscale serve --bg 4400`. Hop is now at `https://hop.<your-tailnet>.ts.net`; `tailscale serve status` shows the address. Open it once on the laptop too, so you use the same address everywhere.

6. **Back up off the laptop** with [step 7](#7-back-up-off-the-server) above (Backblaze B2 and the nightly timer). A laptop is easy to lose, drop, or wipe, so this matters more than on a server. The timer catches up after the laptop was off at 03:30.

7. **Install on your phone and tablet** with [step 8](#8-install-on-your-devices) above.

Optional: to keep Hop running with the lid closed while the laptop is plugged in, set `HandleLidSwitchExternalPower=ignore` in `/etc/systemd/logind.conf`. It takes effect after a reboot.

To update the laptop's Hop after you push changes, see [Updating](#updating).

## Updating

Pushing to GitHub doesn't change the running Hop: it runs from its own copy in `/opt/hop`. When you're ready to deploy what's on `master`:

```bash
sudo /opt/hop/deploy/update.sh
```

The script:

1. Stops if `/opt/hop` has local edits, and does nothing if there's nothing new.
2. Backs up first: the off-site backup when it's set up (which also leaves a local copy in `/var/lib/hop-backup/hop.db`), otherwise just that local copy.
3. Pulls, installs and builds as the `hop` account. **If the build fails, it goes back to the previous version and rebuilds it without restarting Hop**, so Hop keeps running as before.
4. Installs service files from `deploy/` that changed (so edit them there, not in `/etc/systemd/system/`), restarts Hop, and checks that it answers.

Migrations run automatically on startup in one transaction. If the script says the settings templates changed, compare `/etc/hop/hop.env` with `deploy/hop.env.example`. After an update, close and reopen Hop on your devices to load the new version.

Copies of the repository cloned before `deploy/update.sh` existed need one last manual update to get it:

```bash
sudo -u hop -H bash -c 'cd /opt/hop && git checkout -- .yarn/install-state.gz && git pull --ff-only && yarn install && yarn build' && sudo systemctl restart hop
```

## Restoring

- **A mistake inside Hop** (deleted or changed the wrong thing): **Settings → Backup and export → Restore** from a daily backup. Hop saves a safety backup of the current data first.
- **From the off-site copy** (the server is gone or its disk is damaged): set up a server through step 5, then:

  ```bash
  sudo -u hop bash -c 'set -a; . /etc/hop/restic.env; restic restore latest --target /tmp/hop-restore'
  ```

  Then either restore one of the JSON files from `/tmp/hop-restore/opt/hop/storage/backups/` in Settings, or put the database copy in place. The database copy is newer: it's from the last nightly run.

  ```bash
  systemctl stop hop
  # Remove the old write-ahead files too: left next to a different database, they corrupt it.
  rm -f /opt/hop/storage/hop.db /opt/hop/storage/hop.db-wal /opt/hop/storage/hop.db-shm
  install -m 644 -o hop -g hop /tmp/hop-restore/var/lib/hop-backup/hop.db /opt/hop/storage/hop.db
  systemctl start hop
  ```

## Moving to a New Server

1. On the old server, **Back up now**, then download the backup (or let the nightly off-site copy run).
2. Set up the new server through step 4. Give it the same Tailscale name (`hop`) after removing the old machine from the tailnet, so your installed apps keep the same address.
3. Restore as above, then continue with steps 6–8.

## Cost

| Item | Monthly |
| --- | --- |
| Hetzner CX23 (or CAX11) | €5.49 (€5.99) |
| Public IPv4 | €0.50 |
| Hetzner backups (optional) | +20% of the server price |
| Tailscale, Backblaze B2 (under 10 GB) | €0 |

Prices are from Hetzner's list after the June 2026 change, without VAT, and can change. Moving to another provider takes about an hour with the steps above.

## Known Limitations

- While the server is off or unreachable, every device is read-only. Changes aren't queued for later.
- Changes from another device show up when Hop comes back into view or reconnects, not instantly while it stays open. See [Architecture → Known Limitations](ARCHITECTURE.md#known-limitations).
- `yarn start` and `yarn dev` don't read the repository's root `.env` (they start in `apps/api/`), so its settings are ignored outside `start.sh`. The service above passes settings through `/etc/hop/hop.env` instead.
