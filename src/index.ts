const MARKER = 'SERVERLESS_BUILD_RATE_LIMITING_TYPESCRIPT_V1';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') {
      return Response.json({
        pattern: 'Workers Rate Limiting binding',
        marker: MARKER,
        limit: '5 requests per 10 seconds per actor, per Cloudflare location',
        endpoints: ['GET /limited?actor=...', 'GET /health'],
      }, { headers: { 'cache-control': 'no-store' } });
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ ok: true, marker: MARKER });
    }
    if (request.method !== 'GET' || url.pathname !== '/limited') {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Public DEMO identity only. In an app, use a verified account or tenant ID.
    const actor = url.searchParams.get('actor');
    if (!actor || !/^[a-zA-Z0-9_-]{1,40}$/.test(actor)) {
      return Response.json({ error: 'Provide an actor of 1–40 letters, numbers, hyphens, or underscores.' }, { status: 400 });
    }

    const { success } = await env.RATE_LIMITER.limit({ key: `demo:${actor}:/limited` });
    return Response.json(success
      ? { allowed: true, actor, marker: MARKER }
      : { error: 'Rate limit exceeded', actor, marker: MARKER }, {
      status: success ? 200 : 429,
      headers: { 'cache-control': 'no-store' },
    });
  },
} satisfies ExportedHandler<Env>;
