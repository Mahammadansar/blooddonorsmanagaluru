## BLOOD DONORS MANGALURU (R) — JSON storage

Browsers cannot write files directly. To store registrations in a shared JSON file, run the included Node.js server.

### Setup

1. Install Node.js (LTS).
2. In this folder (`d:\BDM`), run:

```bash
npm install
npm run dev
```

The server will start at `http://localhost:5173`.
If that port is busy, this project defaults to `http://localhost:5174`.

### What gets stored

- Donor registrations are saved to `data/donors.json`
- Live Search reads from `GET /api/donors`
- Registration writes to `POST /api/donors`

### Important

- Open the site via the server URL (not by double-clicking `index.html`) so the API calls work.

## Deploy on Vercel

Your pages are static, and the backend lives under `/api/*` (Vercel Serverless Functions).

### Important (data storage)

Vercel is serverless, so it cannot permanently write to `data/donors.json`.
To keep donor registrations persistent on Vercel, set up **Vercel KV** and add these environment variables:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### Steps

- Push this folder to GitHub
- Import the GitHub repo in Vercel
- Add the KV environment variables in the Vercel project settings
- Deploy

## Deploy on Railway

Railway runs the Express server (which also serves the static site).

### Steps

- Push this repo to GitHub
- Railway → **New Project** → **Deploy from GitHub repo**
- Railway will run:
  - Build: `npm install`
  - Start: `npm start`
- Railway automatically sets `PORT` (the server already reads it)

### Persistent donor storage (recommended)

By default, writing to disk may not persist across redeploys.

Best option: add a **Railway Volume**, mount it (example mount path: `/data`), then set:
- `DATA_DIR=/data`

This makes donor registrations persist at `/data/donors.json`.

