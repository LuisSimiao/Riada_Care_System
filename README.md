# Riada Care System — Raspberry Pi Setup Guide

This document describes how to prepare a Raspberry Pi to run the Riada Care System (Node.js backend + React frontend + MariaDB). Follow each section in order.

---

## Supported OS
- Raspberry Pi OS (64-bit) based on Debian (Bullseye/Bookworm or later). Use the latest stable release.

---

## 1) Hardware & network
- Raspberry Pi 3 (recommended minimum) or Pi 4/5 for best performance.
- Power supply, microSD (32GB+ recommended), network connection (Ethernet recommended).
- Static local IP recommended (e.g., 192.168.1.22). Configure in your router or Pi network settings.

---

## 2) System update

Open a terminal and run:

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git
```

---

## 3) Node.js and npm
Recommend Node.js LTS (20.x or current LTS). Install Node 20 via NodeSource or nvm. Example using NodeSource:

```sh
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

If you prefer `nvm`, install `nvm` and use it to manage Node versions.

---

## 4) MariaDB server

Install and secure MariaDB:

```sh
sudo apt install -y mariadb-server mariadb-client
sudo systemctl enable --now mariadb
sudo mysql_secure_installation
```

Create the application database and user (update names/passwords):

```sql
-- login as root: sudo mariadb
CREATE DATABASE hillcrest_database CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER 'riada'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON hillcrest_database.* TO 'riada'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

If you want remote DB access, create a user with `'riada'@'%'` and open port 3306 on the Pi firewall (not recommended without TLS).

---

## 5) Database schema (example)
If you do not have schema files, create the minimum tables used by the app:

```sql
USE hillcrest_database;

CREATE TABLE environment_readings (
  device_id VARCHAR(128) NOT NULL,
  timestamp DATETIME NOT NULL,
  temperature_c TEXT,
  humidity_percent TEXT,
  co_ppm TEXT,
  co2_ppm TEXT
);

CREATE TABLE alerts (
  device_id VARCHAR(128) NOT NULL,
  timestamp DATETIME NOT NULL,
  event_type TEXT,
  acknowledged TINYINT(1) DEFAULT 0
);
```

Note: the app stores encrypted readings in text columns; encryption/decryption handled by `server/encryption.js`.

---

## 6) Clone the repository and install dependencies

On the Pi, pick a location (e.g. `~/Archview/Riada_Care_System`) and clone the repo:

```sh
cd ~
git clone <your-repo-url> Archview/Riada_Care_System
cd Archview/Riada_Care_System
```

Install backend dependencies and frontend dependencies separately:

```sh
# Backend
cd ~/Archview/Riada_Care_System/my-app/server || cd ~/Archview/Riada_Care_System/server
npm install

# Frontend (React)
cd ~/Archview/Riada_Care_System/my-app
npm install
```

Adjust paths above if your repo layout differs.

---

## 7) Configure the application

- Edit `server/db.js` to match your DB settings (host, user, password, database). Example:

```js
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'riada',
  password: 'strong_password_here',
  database: 'hillcrest_database'
});
```

- If `server/encryption.js` expects a key, set it in that file or via environment variable (follow comments in that file). Do not commit secrets.

## Encryption key (store on the Pi)

Keep the main AES key outside the repo in a protected file under `/etc` (example: `/etc/riada/aes_key.b64`). The file should contain the key encoded in base64 (single line).

Quick commands (run on the Pi; replace `<BASE64_KEY>`):

```sh
sudo mkdir -p /etc/riada
echo '<BASE64_KEY>' | sudo tee /etc/riada/aes_key.b64 > /dev/null
sudo chown root:root /etc/riada/aes_key.b64
sudo chmod 0640 /etc/riada/aes_key.b64
sudo chmod 0700 /etc/riada
```

Ensure the service user can read the file (group ownership or ACL) if you do not run the server as root. Example (service runs as `pi`):

```sh
sudo chown root:pi /etc/riada/aes_key.b64
sudo chmod 0640 /etc/riada/aes_key.b64
```

Short Node example to load the key in `server/encryption.js` (do not export plaintext):

```js
const fs = require('fs');
const b64 = fs.readFileSync('/etc/riada/aes_key.b64', 'utf8').trim();
const ENCRYPTION_KEY = Buffer.from(b64, 'base64');
// use ENCRYPTION_KEY in your encryption/decryption functions
```

Notes:
- Never commit the key or the `/etc/riada` file to source control or cloud-sync folders.
- Rotate the key if it is ever exposed and update the file on the Pi.
- Prefer a KMS/HSM for larger deployments; this file approach is acceptable for single Pi setups on a trusted LAN.

## Update Pi IP in code

If the Pi IP changes, update the client fetch URLs to point at your Pi. Files to check and replace the base URL `http://192.168.1.118:3001` with `http://<YOUR_PI_IP>:3001`:

- `my-app/src/AccidentReportPdfPage.js` — two calls in the form submit handler (save-accident-report-pdf, acknowledge-alert)
- `my-app/src/Dashboard.js` — `fetch('/api/available-dates')` and `fetch('/api/write-jsonl-for-date')`
- `my-app/src/DashboardPage.js` — `fetch('/api/environment-data')`
- `my-app/src/DeviceDashboardSelector.js` — `fetch('/api/available-dates')`, `fetch('/api/latest-readings')`, `fetch('/api/unacknowledged-alerts')`, and `fetch('/api/write-jsonl-for-date')`

Quick non-destructive replace on the Pi (run from project root):

```sh
# replace with your IP (example 192.168.1.116)
find . -type f -name "*.js" -print0 | xargs -0 sed -n "1,200p" > /dev/null 2>&1 || true
# simple replace
grep -rl "192.168.1.118:3001" | xargs -r sed -i "s|http://192.168.1.118:3001|http://<YOUR_PI_IP>:3001|g"
```

- If you changed the device IDs, update `server/livyMqttListener.js` with the correct device IDs for Hillcrest.

---

## 8) Build or run the frontend

For development (hosted on port 3000 by CRA):

```sh
cd ~/Archview/Riada_Care_System/my-app
npm start
```

For production (build static files and serve from backend or a static server):

```sh
npm run build
# Option A: Serve build with a static server (e.g., serve)
npm install -g serve
serve -s build -l 3000

# OR
# Option B: Configure the backend (Express) to serve the 'build' folder
```

---

## 9) Start the Node backend manually

```sh
cd ~/Archview/Riada_Care_System/my-app
node server/server.js
```

Confirm backend listens on the configured port. If port in use, stop previous process (`sudo lsof -i :3001` then `sudo kill <PID>`).

---

## 10) Autostart at boot (recommended: systemd services)
Create two systemd service files so frontend and backend start reliably.

### Backend service: `/etc/systemd/system/riada-backend.service`

```
[Unit]
Description=Riada Care Backend
After=network.target mariadb.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Archview/Riada_Care_System/my-app
ExecStart=/usr/bin/node server/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Frontend service (if you use `serve`) : `/etc/systemd/system/riada-frontend.service`

```
[Unit]
Description=Riada Care Frontend
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Archview/Riada_Care_System/my-app
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=development

[Install]
WantedBy=multi-user.target
```

Reload systemd and enable services:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now riada-backend.service
sudo systemctl enable --now riada-frontend.service
sudo journalctl -u riada-backend -f
```

Tip: If using production static `serve`, change `ExecStart` in frontend service to the `serve` command and working directory to `my-app/build`.

---

## 11) Samba file sharing (optional)
If you want to share `public/Accident Reports` over the network:

```sh
sudo apt install -y samba
sudo mkdir -p /home/pi/Archview/Riada_Care_System/public/Accident\ Reports
sudo chown -R pi:pi /home/pi/Archview/Riada_Care_System/public/Accident\ Reports
sudo chmod -R 775 /home/pi/Archview/Riada_Care_System/public/Accident\ Reports
```

Add to `/etc/samba/smb.conf` (at end):

```
[Accident Reports]
  path = "/home/pi/Archview/Riada_Care_System/public/Accident Reports"
  browseable = yes
  read only = no
  guest ok = yes
  force user = pi
```

Restart Samba:

```sh
sudo systemctl restart smbd
```

Access from Windows: `\\<Pi_IP>\Accident Reports` (no quotes). If the share name contains spaces, use the exact text including spaces.

---

## 12) Firewall (optional)
Use `ufw` to allow necessary ports:

```sh
sudo apt install -y ufw
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 3000/tcp # Frontend (if using dev server)
sudo ufw allow 3001/tcp # Backend
sudo ufw allow 3306/tcp # MariaDB (if remote allowed)
sudo ufw allow 445/tcp  # Samba
sudo ufw enable
```

---

## 13) Troubleshooting
- Port in use: `sudo lsof -i :3001` then `sudo kill <PID>`.
- Check logs: `sudo journalctl -u riada-backend -f` and `sudo journalctl -u riada-frontend -f`.
- DB connection errors: verify `server/db.js` credentials and that MariaDB is running: `sudo systemctl status mariadb`.
- Missing data / wrong device mapping: verify device IDs in `server/livyMqttListener.js` and confirm MQTT messages contain the expected topic structure.
- Date format or UI issues: backend endpoint `/api/available-dates` supplies `YYYY-MM-DD` strings.

---

## 14) Security notes
- Do not expose MariaDB to the public internet without TLS and strong credentials.
- Use secure passwords and store secrets (encryption key) outside source control (environment variables or a protected config file).
- If you enable Samba guest access, be aware files are writable by anyone on the LAN.
