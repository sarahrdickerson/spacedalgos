import fs from "fs";
import path from "path";
import FeedbackForm from "./_components/feedback-form";

const CATS_DIR = path.join(process.cwd(), "public", "images", "cats");
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function getCatImages(): string[] {
  try {
    return fs
      .readdirSync(CATS_DIR)
      .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .map((f) => `/images/cats/${f}`);
  } catch {
    return [];
  }
}

export default function FeedbackPage() {
  const catImages = getCatImages();
  return <FeedbackForm catImages={catImages} />;
}
