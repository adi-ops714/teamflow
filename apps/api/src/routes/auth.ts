import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  organizationName: z.string().min(2).max(80)
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const makeToken = (id: string) => jwt.sign({ sub: id }, process.env.JWT_SECRET!, { expiresIn: "7d" });

router.post("/signup", async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const email = data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name, email, passwordHash,
        memberships: { create: { role: "OWNER", organization: { create: { name: data.organizationName } } } }
      },
      select: { id: true, name: true, email: true }
    });
    res.status(201).json({ token: makeToken(user.id), user });
  } catch (e) { next(e); }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) return res.status(401).json({ error: "Email or password is incorrect" });
    res.json({ token: makeToken(user.id), user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) { next(e); }
});

router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, memberships: { include: { organization: true } } }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) { next(e); }
});
export default router;
