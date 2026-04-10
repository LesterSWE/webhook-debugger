# Webhook Debugger

A real-time webhook inspection tool. Get a unique endpoint URL, point any service at it, and watch incoming requests appear instantly — with full headers, body, and query parameters.

Built as a developer utility for inspecting and debugging webhook payloads from services like Stripe, Shopify, GitHub, and more.

## Features

- **Unique session URLs** — each visitor gets their own private endpoint
- **Real-time delivery** — requests appear instantly via Server-Sent Events (SSE)
- **Full request inspection** — view body, headers, and query parameters in separate tabs
- **Request history** — last 50 requests stored per session
- **Pretty-printed JSON** — formatted body output for easy reading
- **Method badges** — color-coded POST, GET, PUT, PATCH, DELETE indicators
- **Copy endpoint** — one-click copy of your webhook URL
- **Clear history** — wipe the request list and start fresh

## Tech Stack

- **Frontend** — React + TypeScript + Vite + Tailwind CSS, deployed on Vercel
- **Backend** — Node.js + Express, deployed on Railway
- **Real-time** — Server-Sent Events (SSE) for live request streaming

## How It Works

```
Webhook sender → Railway server → stores payload
                                       ↓
                               SSE pushes to browser
                                       ↓
                               UI displays instantly
```

1. Browser requests a session from the server (`GET /session`)
2. Browser opens an SSE connection (`GET /listen/:sessionId`)
3. Any service sends a webhook to your unique URL (`POST /webhook/:sessionId`)
4. Server stores the request and streams it to the browser via SSE
5. Request appears in the UI instantly

## Local Development

### Prerequisites

- Node.js 18+

### Server

```bash
cd server
npm install
npm run dev
# Runs on http://localhost:3001
```

### Client

```bash
cd client
npm install
npm run dev
# Runs on http://localhost:5173
```

Create a `.env.local` in the `client` directory:

```
VITE_SERVER_URL=http://localhost:3001
```

### Testing locally

```bash
curl -X POST http://localhost:3001/webhook/YOUR_SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{"event": "order.created", "order_id": "12345", "amount": 99.99}'
```

## Deployment

### Backend → Railway

```bash
cd server
npm install -g @railway/cli
railway login
railway init
railway up
```

Generate a public domain in Railway → Settings → Networking.

### Frontend → Vercel

```bash
cd client
vercel env add VITE_SERVER_URL   # paste your Railway URL
vercel --prod
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/session` | Create a new session, returns `{ sessionId }` |
| `GET` | `/listen/:sessionId` | SSE stream for incoming webhooks |
| `ANY` | `/webhook/:sessionId` | Receive a webhook (all HTTP methods) |
