import { PrismaClient, Role, TaskStatus, Priority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@teamflow.local" },
    update: {},
    create: { name: "Demo User", email: "demo@teamflow.local", passwordHash }
  });

  let org = await prisma.organization.findFirst({ where: { name: "Acme Studio" } });
  if (!org) org = await prisma.organization.create({ data: { name: "Acme Studio" } });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: { role: Role.OWNER },
    create: { userId: user.id, organizationId: org.id, role: Role.OWNER }
  });

  let project = await prisma.project.findFirst({ where: { organizationId: org.id, name: "Website redesign" } });
  if (!project) project = await prisma.project.create({
    data: { name: "Website redesign", description: "Plan and ship the new marketing website.", organizationId: org.id }
  });

  const count = await prisma.task.count({ where: { projectId: project.id } });
  if (count === 0) {
    await prisma.task.createMany({ data: [
      { title: "Create landing page wireframe", description: "Draft the home page structure.", status: TaskStatus.TODO, priority: Priority.HIGH, projectId: project.id, assigneeId: user.id },
      { title: "Build navigation component", description: "Responsive navigation and mobile menu.", status: TaskStatus.IN_PROGRESS, priority: Priority.MEDIUM, projectId: project.id, assigneeId: user.id },
      { title: "Review color system", description: "Check contrast and design tokens.", status: TaskStatus.REVIEW, priority: Priority.LOW, projectId: project.id },
      { title: "Set up repository", description: "Initialize project and linting.", status: TaskStatus.DONE, priority: Priority.URGENT, projectId: project.id }
    ]});
  }
  console.log("Seed complete.");
}

main().finally(() => prisma.$disconnect());
