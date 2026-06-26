export default async function handler(req: any, res: any) {
  res.json({ ok: true, path: req.url });
}
