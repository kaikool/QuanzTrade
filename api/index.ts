// Debug: minimal handler
import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

app.get("/api/ping", (_, res) => res.json({ ok: true }));

export default app;
