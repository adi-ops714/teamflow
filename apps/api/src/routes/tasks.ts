import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

const router = Router();
async function canAccessProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { organizationId: true } });
  if (!project) return false;
  const member = await prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId: project.organizationId } } });
  return Boolean(member);
}
router.get("/project/:projectId", async (req: AuthRequest, res, next) => {
  try {
    if (!await canAccessProject(req.userId!, req.params.projectId)) return res.status(403).json({ error: "Project access denied" });
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.projectId },
      include: { assignee: { select: { id: true, name: true, email: true } }, _count: { select: { comments: true } } },
      orderBy: { updatedAt: "desc" }
    });
    res.json(tasks);
  } catch (e) { next(e); }
});
router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({
      projectId: z.string(), title: z.string().min(2).max(160), description: z.string().max(2000).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
      status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("TODO"),
      dueDate: z.string().datetime().optional()
    }).parse(req.body);
    if (!await canAccessProject(req.userId!, body.projectId)) return res.status(403).json({ error: "Project access denied" });
    const task = await prisma.task.create({ data: { ...body, description: body.description ?? "", dueDate: body.dueDate ? new Date(body.dueDate) : null } });
    await prisma.activity.create({ data: { action: "created", details: `created task "${task.title}"`, taskId: task.id, userId: req.userId! } });
    res.status(201).json(task);
  } catch (e) { next(e); }
});
router.patch("/:id", async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({
      title: z.string().min(2).max(160).optional(), description: z.string().max(2000).optional(),
      status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      assigneeId: z.string().nullable().optional()
    }).parse(req.body);
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!existing || !await canAccessProject(req.userId!, existing.projectId)) return res.status(404).json({ error: "Task not found" });
    const task = await prisma.task.update({ where: { id: existing.id }, data: body });
    const changed = Object.keys(body).join(", ");
    await prisma.activity.create({ data: { action: "updated", details: `updated ${changed} on "${task.title}"`, taskId: task.id, userId: req.userId! } });
    res.json(task);
  } catch (e) { next(e); }
});
router.get("/:id/comments", async (req: AuthRequest, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { projectId: true } });
    if (!task || !await canAccessProject(req.userId!, task.projectId)) return res.status(404).json({ error: "Task not found" });
    const comments = await prisma.comment.findMany({ where: { taskId: req.params.id }, include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
    res.json(comments);
  } catch (e) { next(e); }
});
router.post("/:id/comments", async (req: AuthRequest, res, next) => {
  try {
    const { body } = z.object({ body: z.string().min(1).max(1000) }).parse(req.body);
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task || !await canAccessProject(req.userId!, task.projectId)) return res.status(404).json({ error: "Task not found" });
    const comment = await prisma.comment.create({ data: { body, taskId: task.id, authorId: req.userId! }, include: { author: { select: { name: true } } } });
    await prisma.activity.create({ data: { action: "commented", details: `commented on "${task.title}"`, taskId: task.id, userId: req.userId! } });
    res.status(201).json(comment);
  } catch (e) { next(e); }
});
export default router;
