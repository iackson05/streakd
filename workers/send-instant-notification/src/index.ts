export interface Env {
  BACKEND_URL: string;
  INTERNAL_API_SECRET: string;
}

interface InstantNotificationPayload {
  userId: string;
  type: string;
  data: Record<string, unknown>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    let payload: InstantNotificationPayload;
    try {
      payload = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const response = await fetch(`${env.BACKEND_URL}/internal/send-instant-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
