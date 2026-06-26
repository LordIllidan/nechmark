import express from "express";
import cors from "cors";
import { join } from "path";
import { buildContainer } from "../infrastructure/container";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(join(process.cwd(), "public")));

const { router } = buildContainer();
app.use("/api", router);

// SPA fallback
app.get("/*path", (_req, res) => {
  res.sendFile(join(process.cwd(), "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`nechmark UI: http://localhost:${PORT}`);
});
