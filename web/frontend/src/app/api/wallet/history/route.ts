export async function GET(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_VTU_BACKEND_URL;
  const useEnv = !!envUrl && !/localhost|127\.0\.0\.1/i.test(envUrl);
  const backend = useEnv ? (envUrl as string) : 'https://osghubvtubackend.onrender.com';
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  const auth = req.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  const res = await fetch(`${backend}/api/wallet/history`, { method: 'GET', headers });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
}
