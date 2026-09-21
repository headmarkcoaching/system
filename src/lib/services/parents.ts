import "server-only";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const PAGE_SIZE = 15;

export async function listParents({ page = 1, q }: { page?: number; q?: string }) {
  const where = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    db.parent.findMany({
      where,
      include: { children: { include: { student: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.parent.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export function listParentsForPicker(q?: string) {
  return db.parent.findMany({
    where: q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }] } : undefined,
    take: 20,
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, phone: true },
  });
}

export function getParentById(id: string) {
  return db.parent.findUnique({
    where: { id },
    include: { children: { include: { student: { include: { academicLevel: true } } } }, user: true },
  });
}

export interface CreateParentInput {
  fullName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  createLogin?: boolean;
  loginPassword?: string;
}

export async function createParent(input: CreateParentInput) {
  let userId: string | undefined;
  if (input.createLogin && input.loginPassword) {
    const role = await db.role.findUniqueOrThrow({ where: { key: "PARENT" } });
    const passwordHash = await bcrypt.hash(input.loginPassword, 10);
    const user = await db.user.create({
      data: {
        name: input.fullName,
        email: input.email || undefined,
        phone: input.phone || undefined,
        passwordHash,
        roleId: role.id,
        roleKey: "PARENT",
      },
    });
    userId = user.id;
  }

  return db.parent.create({
    data: {
      userId,
      fullName: input.fullName,
      phone: input.phone,
      whatsapp: input.whatsapp,
      email: input.email,
      city: input.city,
    },
  });
}

export async function updateParent(id: string, data: Partial<Pick<CreateParentInput, "fullName" | "phone" | "whatsapp" | "email" | "city">>) {
  return db.parent.update({ where: { id }, data });
}

export function getChildrenForParentUser(userId: string) {
  return db.parent.findUnique({
    where: { userId },
    include: {
      children: {
        include: {
          student: {
            include: { academicLevel: true, batchMemberships: { include: { batch: true } } },
          },
        },
      },
    },
  });
}
