import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    const { base64, mediaType } = await req.json();
    const osmKey = Deno.env.get('OSM_API_KEY');
    const osmBaseUrl = Deno.env.get('OSM_BASE_URL') || 'https://api.osmapi.com/v1';
    if (!osmKey) return new Response(JSON.stringify({ error: 'OSM_API_KEY not configured' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    const dataUrl = `data:${mediaType};base64,${base64}`;
    const response = await fetch(`${osmBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${osmKey}` },
      body: JSON.stringify({ model: 'gemma-4-26b-a4b-it', messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl } }, { type: 'text', text: 'Extract bill info as JSON: {"title":"","vendor":"","description":"","date":"YYYY-MM-DD","amount":"","currency":"INR","tax":"","payment_method":"Cash","items":[{"description":"","qty":"","rate":"","amount":""}],"raw":""}. Return ONLY JSON.' }] }] }),
    });
    if (!response.ok) { const e = await response.json().catch(() => ({})); return new Response(JSON.stringify({ error: e.error?.message ?? `OSM error ${response.status}` }), { status: response.status, headers: { ...CORS, 'Content-Type': 'application/json' } }); }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return new Response(JSON.stringify(parsed), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Unknown error' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
