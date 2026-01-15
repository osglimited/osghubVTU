function resolveBackend() {
  const envUrl = process.env.NEXT_PUBLIC_VTU_BACKEND_URL;
  const envUrlLocal = process.env.NEXT_PUBLIC_VTU_BACKEND_URL_LOCAL;
  if (envUrlLocal) return envUrlLocal as string;
  if (envUrl) return envUrl as string;
  return 'https://osghubvtubackend.onrender.com';
}

export async function GET(req: Request) {
  const backend = resolveBackend();
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  const auth = req.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  const res = await fetch(`${backend}/api/wallet`, { method: 'GET', headers });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
}
