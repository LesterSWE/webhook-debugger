import { useEffect, useRef, useState } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

interface WebhookRequest {
  id: string;
  timestamp: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  query: Record<string, unknown>;
}

const METHOD_COLORS: Record<string, string> = {
  POST: 'bg-green-500',
  GET: 'bg-blue-500',
  PUT: 'bg-amber-500',
  PATCH: 'bg-purple-500',
  DELETE: 'bg-red-500',
};

function formatBody(body: unknown): string {
  if (!body || (typeof body === 'object' && Object.keys(body as object).length === 0)) return '';
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [selected, setSelected] = useState<WebhookRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'query'>('body');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    initSession();
    return () => eventSourceRef.current?.close();
  }, []);

  const initSession = async () => {
    const res = await fetch(`${SERVER_URL}/session`);
    const { sessionId } = await res.json();
    setSessionId(sessionId);
    connectSSE(sessionId);
  };

  const connectSSE = (id: string) => {
    const es = new EventSource(`${SERVER_URL}/listen/${id}`);
    eventSourceRef.current = es;
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      const data: WebhookRequest = JSON.parse(e.data);
      setRequests(prev => {
        const exists = prev.some(r => r.id === data.id);
        return exists ? prev : [data, ...prev];
      });
    };
    es.onerror = () => setConnected(false);
  };

  const webhookUrl = sessionId ? `${SERVER_URL}/webhook/${sessionId}` : '';

  const copyUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setRequests([]);
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🪝</span>
          <div>
            <h1 className="text-lg font-bold">Webhook Debugger</h1>
            <p className="text-xs text-gray-400">Inspect incoming webhook requests in real time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-400">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Endpoint URL bar */}
      <div className="px-6 py-4 bg-gray-900 border-b border-gray-800">
        <p className="text-xs text-gray-400 mb-2">Your webhook endpoint — send requests here:</p>
        <div className="flex gap-2">
          <code className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-green-400 font-mono truncate">
            {webhookUrl || 'Generating...'}
          </code>
          <button
            onClick={copyUrl}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {copied ? '✓ Copied' : 'Copy URL'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Request list */}
        <div className="w-80 border-r border-gray-800 flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-medium text-gray-300">
              Requests {requests.length > 0 && <span className="text-gray-500">({requests.length})</span>}
            </span>
            {requests.length > 0 && (
              <button onClick={clearAll} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                Clear all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                <p className="text-4xl mb-4">📭</p>
                <p className="text-gray-400 text-sm">No requests yet</p>
                <p className="text-gray-600 text-xs mt-2">Copy the URL above and send a request to see it appear here</p>
              </div>
            ) : (
              requests.map(req => (
                <button
                  key={req.id}
                  onClick={() => { setSelected(req); setActiveTab('body'); }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-900 transition-colors ${selected?.id === req.id ? 'bg-gray-900 border-l-2 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`${METHOD_COLORS[req.method] ?? 'bg-gray-500'} text-white text-xs font-bold px-2 py-0.5 rounded`}>
                      {req.method}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {req.body && typeof req.body === 'object' && Object.keys(req.body as object).length > 0
                      ? JSON.stringify(req.body).slice(0, 60) + '...'
                      : 'No body'}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <p className="text-4xl mb-4">👈</p>
              <p className="text-gray-400 text-sm">Select a request to inspect it</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-4">
                <span className={`${METHOD_COLORS[selected.method] ?? 'bg-gray-500'} text-white text-sm font-bold px-3 py-1 rounded`}>
                  {selected.method}
                </span>
                <span className="text-gray-400 text-sm">{new Date(selected.timestamp).toLocaleString()}</span>
              </div>

              <div className="flex gap-1 px-6 pt-4 border-b border-gray-800">
                {(['body', 'headers', 'query'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${activeTab === tab ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'body' && (
                  <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-green-300 font-mono whitespace-pre-wrap break-all">
                    {formatBody(selected.body) || <span className="text-gray-600">No body</span>}
                  </pre>
                )}

                {activeTab === 'headers' && (
                  <div className="space-y-2">
                    {Object.entries(selected.headers).map(([key, value]) => (
                      <div key={key} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 flex gap-4">
                        <span className="text-blue-400 text-sm font-mono font-medium w-48 flex-shrink-0">{key}</span>
                        <span className="text-gray-300 text-sm font-mono break-all">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'query' && (
                  Object.keys(selected.query).length === 0 ? (
                    <p className="text-gray-600 text-sm">No query parameters</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(selected.query).map(([key, value]) => (
                        <div key={key} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 flex gap-4">
                          <span className="text-purple-400 text-sm font-mono font-medium w-48 flex-shrink-0">{key}</span>
                          <span className="text-gray-300 text-sm font-mono">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
