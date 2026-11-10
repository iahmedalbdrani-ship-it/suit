"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, rateLimit, safeNext } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clientIp, loc, qs, s } from "./_util";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function loginAction(fd: FormData) {
  const locale = loc(fd);
  const email = s(fd, "email", 200).toLowerCase();
  const password = s(fd, "password", 200);
  const next = safeNext(s(fd, "next", 500), `/${locale}/account`);
  const back = (error: string) => redirect(`/${locale}/login${qs({ error, next, email })}`);

  if (!rateLimit(`login:${await clientIp()}:${email}`)) back("rate_limited");
  if (!email || !password) back("required");
  const user = await db().prepare("SELECT id, password_hash FROM users WHERE email = ?").get<{ id: number; password_hash: string }>(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) back("invalid_credentials");
  await createSession(user!.id);
  redirect(next);
}

export async function registerAction(fd: FormData) {
  const locale = loc(fd);
  const name = s(fd, "name", 80);
  const email = s(fd, "email", 200).toLowerCase();
  const phone = s(fd, "phone", 20).replace(/[^\d+]/g, "");
  const password = s(fd, "password", 200);
  const asHost = fd.get("asHost") === "on";
  const next = safeNext(s(fd, "next", 500), asHost ? `/${locale}/host` : `/${locale}/account`);
  const back = (error: string) => redirect(`/${locale}/register${qs({ error, next, email, name })}`);

  if (!rateLimit(`register:${await clientIp()}`, 10)) back("rate_limited");
  if (!name || !email || !password) back("required");
  if (!EMAIL.test(email)) back("invalid_email");
  if (password.length < 8) back("weak_password");
  if (await db().prepare("SELECT 1 FROM users WHERE email = ?").get(email)) back("email_taken");
  const r = await db().prepare("INSERT INTO users (name, email, phone, password_hash, role) VALUES (?,?,?,?,?)")
    .run(name, email, phone || null, await hashPassword(password), asHost ? "host" : "guest");
  await createSession(r.lastInsertRowid);
  redirect(next);
}

export async function logoutAction(fd: FormData) {
  const locale = loc(fd);
  await destroySession();
  redirect(`/${locale}`);
}
