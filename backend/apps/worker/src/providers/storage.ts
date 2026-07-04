import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = process.env.PUBLIC_UPLOADS_DIR ?? "/opt/studio-neeklo/uploads";
const BASE_URL = (process.env.PUBLIC_UPLOADS_URL ?? "https://studio.neeklo.ru/uploads").replace(
  /\/$/,
  "",
);

/** Сохраняет файл в публичную папку (nginx /uploads/) и возвращает публичный URL. */
export async function savePublicFile(name: string, data: Buffer): Promise<string> {
  await mkdir(DIR, { recursive: true });
  await writeFile(join(DIR, name), data);
  return `${BASE_URL}/${name}`;
}

/**
 * Приводит вход-изображение к публичному URL, который понимает провайдер.
 * data:URL (загрузка из браузера) сохраняем в /uploads и отдаём ссылку;
 * http(s) — отдаём как есть. Иначе возвращаем undefined.
 */
export async function resolveImageUrl(
  value: unknown,
  hint: string,
): Promise<string | undefined> {
  if (typeof value !== "string" || !value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  const m = /^data:(image\/(png|jpe?g|webp|gif));base64,(.+)$/i.exec(value);
  if (!m) return undefined;
  const ext = m[2].toLowerCase().includes("png")
    ? "png"
    : m[2].toLowerCase().includes("webp")
      ? "webp"
      : "jpg";
  const buf = Buffer.from(m[3], "base64");
  const name = `frame-${hint}-${Date.now().toString(36)}.${ext}`;
  return savePublicFile(name, buf);
}
