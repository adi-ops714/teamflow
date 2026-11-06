import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

const router = Router();
async function membership(userId: string, organizationId: string) {
  return prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId } } });
}
router.get("/organizations", async (req: AuthRequest, res, next) => {
  try {
    const rows = await prisma.membership.findMany({
      where: { userId: req.userId }, include: { organization: true }
    });
    res.json(rows.map(r => ({ ...r.organization, role: r.role })));
  } catch (e) { next(e); }
});
router.post("/projects", async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ organizationId: z.string(), name: z.string().min(2).max(100), description: z.string().max(500).optional() }).parse(req.body);
    if (!await membership(req.userId!, body.organizationId)) return res.status(403).json({ error: "Not a member of this organization" });
    const project = await prisma.project.create({ data: { ...body, description: body.description ?? "" } });
    res.status(201).json(project);
  } catch (e) { next(e); }
});
router.get("/projects", async (req: AuthRequest, res, next) => {
  try {
    const orgId = String(req.query.organizationId || "");
    if (!orgId || !await membership(req.userId!, orgId)) return res.status(403).json({ error: "Organization access denied" });
    const projects = await prisma.project.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { updatedAt: "desc" }
    });
    res.json(projects);
  } catch (e) { next(e); }
});
router.get("/dashboard", async (req: AuthRequest, res, next) => {
  try {
    const orgId = String(req.query.organizationId || "");
    if (!orgId || !await membership(req.userId!, orgId)) return res.status(403).json({ error: "Organization access denied" });
    const projects = await prisma.project.findMany({ where: { organizationId: orgId }, select: { id: true } });
    const ids = projects.map(p => p.id);
    const [total, todo, progress, review, done, recent] = await Promise.all([
      prisma.task.count({ where: { projectId: { in: ids } } }),
      prisma.task.count({ where: { projectId: { in: ids }, status: "TODO" } }),
      prisma.task.count({ where: { projectId: { in: ids }, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { projectId: { in: ids }, status: "REVIEW" } }),
      prisma.task.count({ where: { projectId: { in: ids }, status: "DONE" } }),
      prisma.activity.findMany({ where: { task: { projectId: { in: ids } } }, include: { user: { select: { name: true } }, task: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 8 })
    ]);
    res.json({ total, todo, progress, review, done, recent });
  } catch (e) { next(e); }
});
export default router;
