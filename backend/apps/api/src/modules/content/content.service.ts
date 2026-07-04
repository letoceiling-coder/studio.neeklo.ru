import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaService } from "../prisma/prisma.service.js";

const UPLOAD_DIR = process.env.PUBLIC_UPLOADS_DIR ?? "/opt/studio-neeklo/uploads";
const UPLOAD_URL = (
  process.env.PUBLIC_UPLOADS_URL ?? "https://studio.neeklo.ru/uploads"
).replace(/\/$/, "");

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<unknown> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  async set(key: string, value: unknown): Promise<unknown> {
    const row = await this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    });
    return row.value;
  }

  /** Сохраняет картинку из data:URL в публичную папку (nginx /uploads/). */
  async saveImage(dataUrl: string, nameHint?: string): Promise<{ url: string }> {
    const m = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/i.exec(dataUrl);
    if (!m) throw new Error("Некорректный формат изображения (ожидается data:image/...)");
    const ext = m[2].toLowerCase() === "jpeg" ? "jpg" : m[2].toLowerCase();
    const buf = Buffer.from(m[3], "base64");
    if (buf.length > 8 * 1024 * 1024) throw new Error("Файл больше 8 МБ");
    const safe = (nameHint ?? "img").replace(/[^a-z0-9_-]+/gi, "-").slice(0, 40) || "img";
    const name = `home-${safe}-${randomUUID().slice(0, 8)}.${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(join(UPLOAD_DIR, name), buf);
    return { url: `${UPLOAD_URL}/${name}` };
  }
}
