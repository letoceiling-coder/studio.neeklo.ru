#!/usr/bin/env node
/**
 * Seed / upgrade a superadmin user.
 *
 * Usage (defaults to the platform superadmin):
 *   node scripts/seed-superadmin.mjs
 *
 * Override via env:
 *   SUPERADMIN_EMAIL=... SUPERADMIN_NAME="..." SUPERADMIN_PASSWORD=... \
 *     node scripts/seed-superadmin.mjs
 *
 * Idempotent: if the user exists it is promoted to superadmin and the
 * password is reset only when SUPERADMIN_RESET_PASSWORD=1.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = (process.env.SUPERADMIN_EMAIL ?? "dsc-23@yandex.ru").trim().toLowerCase();
const name = process.env.SUPERADMIN_NAME ?? "Джон Уик";
const password = process.env.SUPERADMIN_PASSWORD ?? "Kucaevasveta19";
const resetPassword = process.env.SUPERADMIN_RESET_PASSWORD === "1";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        role: "superadmin",
        name,
        ...(resetPassword ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      },
    });
    console.log(
      `Promoted existing user to superadmin: ${email}` +
        (resetPassword ? " (password reset)" : " (password unchanged)"),
    );
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      role: "superadmin",
      planId: "business",
      credits: 100000,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  console.log(`Created superadmin: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
