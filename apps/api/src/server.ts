import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import workspaceRoutes from "./routes/workspace";
import taskRoutes from "./routes/tasks";
import { requireAuth } from "./middleware/auth";
import { errorHandler, notFound } from "./middleware/errors";

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) throw new Error("DATABASE_URL and JWT_SECRET must be configured");
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api", requireAuth, workspaceRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`TeamFlow API running on http://localhost:${port}`));
