export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ status: 'authenticated', user: body.username });
}

