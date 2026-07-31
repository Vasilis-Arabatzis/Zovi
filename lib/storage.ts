import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

export class InvalidImageError extends Error {}

export async function saveProductImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new InvalidImageError("Only PNG, JPEG, or WebP images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new InvalidImageError("Image must be smaller than 8MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const optimized = await sharp(buffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${randomBytes(16).toString("hex")}.webp`;
  await writeFile(path.join(UPLOAD_DIR, filename), optimized);

  return `/uploads/products/${filename}`;
}
