// Vercel entry — dynamic import server.ts with error catch
export default async function handler(req: any, res: any) {
  try {
    const mod = await import("../server");
    if (typeof mod.default === "function") {
      await mod.default(req, res);
    } else {
      res.status(500).json({ error: "server.ts default export not a function", type: typeof mod.default });
    }
  } catch (e: any) {
    res.status(500).json({
      error: e.message,
      stack: (e.stack || "").split("\n").slice(0, 5),
      name: e.name,
    });
  }
}
