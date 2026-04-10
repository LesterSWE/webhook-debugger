import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// sessionId -> SSE response
const sseClients = new Map<string, Response>();

// sessionId -> array of captured requests
interface WebhookRequest {
  id: string;
  timestamp: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  query: Record<string, unknown>;
}
const webhookHistory = new Map<string, WebhookRequest[]>();

// Create a new session
app.get('/session', (_req: Request, res: Response) => {
  const sessionId = crypto.randomBytes(6).toString('hex');
  webhookHistory.set(sessionId, []);
  res.json({ sessionId });
});

// SSE endpoint — browser connects here to receive live webhook events
app.get('/listen/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.set(sessionId, res);

  // Send existing history on connect
  const history = webhookHistory.get(sessionId) ?? [];
  for (const entry of history) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  req.on('close', () => {
    sseClients.delete(sessionId);
  });
});

// Webhook receiver — all methods
app.all('/webhook/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const entry: WebhookRequest = {
    id: crypto.randomBytes(4).toString('hex'),
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers as Record<string, string | string[] | undefined>,
    body: req.body,
    query: req.query as Record<string, unknown>,
  };

  // Store in history (keep last 50)
  const history = webhookHistory.get(sessionId) ?? [];
  history.unshift(entry);
  if (history.length > 50) history.pop();
  webhookHistory.set(sessionId, history);

  // Push to SSE client if connected
  const client = sseClients.get(sessionId);
  if (client) {
    client.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  res.status(200).json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
