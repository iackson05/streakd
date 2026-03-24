export interface Env {
  BACKEND_URL: string;
  INTERNAL_API_SECRET: string;
}

async function triggerStreakNotifications(env: Env): Promise<unknown> {
  const response = await fetch(`${env.BACKEND_URL}/internal/send-streak-notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': env.INTERNAL_API_SECRET,
    },
  });
  return response.json();
}

export default {
  // Runs on the cron schedule defined in wrangler.toml
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      triggerStreakNotifications(env).then((result) => {
        console.log('Streak notifications result:', JSON.stringify(result));
      })
    );
  },

  // HTTP handler for manual testing: curl https://your-worker.workers.dev
  async fetch(_request: Request, env: Env): Promise<Response> {
    const result = await triggerStreakNotifications(env);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
