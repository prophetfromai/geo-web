const FUNCTIONS_URL = import.meta.env.DEV
  ? 'http://127.0.0.1:5001/geo-web-audit/europe-west2'
  : `https://europe-west2-geo-web-audit.cloudfunctions.net`;

export async function submitAudit(url: string): Promise<{ auditId: string }> {
  const res = await fetch(`${FUNCTIONS_URL}/submitAudit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Failed to submit audit');
  }

  return res.json();
}

export interface AuditStatusResponse {
  auditId: string;
  url: string;
  domain: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: { phase: string; pagesCrawled?: number; maxPages?: number };
  result?: unknown;
  recommendations?: unknown;
  error?: string;
  completedAt?: string;
}

export async function getAuditStatus(auditId: string): Promise<AuditStatusResponse> {
  const res = await fetch(`${FUNCTIONS_URL}/getAuditStatus?id=${auditId}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Failed to get audit status');
  }

  return res.json();
}

export function pollAuditStatus(
  auditId: string,
  onUpdate: (data: AuditStatusResponse) => void,
  intervalMs = 2500,
): () => void {
  let active = true;

  const poll = async () => {
    while (active) {
      try {
        const data = await getAuditStatus(auditId);
        onUpdate(data);

        if (data.status === 'completed' || data.status === 'failed') {
          break;
        }
      } catch (err) {
        console.error('Poll error:', err);
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }
  };

  poll();

  return () => { active = false; };
}
