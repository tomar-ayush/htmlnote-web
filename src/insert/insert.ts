import { notify } from "../dialog/dialog";
import { change, ensureCaret, escapeHtml, focusDoc, getDoc, onPageReady } from "../editor/editor";

const MAX_IMAGE_WIDTH = 1600;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export function insertHtml(html: string) {
  const doc = getDoc();
  if (!doc) return;
  focusDoc();
  ensureCaret(doc);
  change(() => doc.execCommand("insertHTML", false, html));
}

export function tableHtml(rows: number, cols: number) {
  const cell = '<td style="border:1px solid #c8c6c4;padding:6px 10px;min-width:60px"><br></td>';
  return `<table style="border-collapse:collapse;margin:8px 0"><tbody>${`<tr>${cell.repeat(cols)}</tr>`.repeat(rows)}</tbody></table><p><br></p>`;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function imageDataUrl(file: File) {
  const url = await readAsDataUrl(file);
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return url;
  const img = new Image();
  img.src = url;
  await img.decode();
  if (img.naturalWidth <= MAX_IMAGE_WIDTH) return url;
  const canvas = document.createElement("canvas");
  canvas.width = MAX_IMAGE_WIDTH;
  canvas.height = Math.round((img.naturalHeight * MAX_IMAGE_WIDTH) / img.naturalWidth);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85);
}

export async function insertImageFile(file: File) {
  const src = await imageDataUrl(file);
  insertHtml(`<img src="${src}" alt="${escapeHtml(file.name)}" style="max-width:100%">`);
}

export async function insertVideoFile(file: File) {
  if (file.size > MAX_VIDEO_BYTES) throw new Error("Videos are limited to 25 MB.");
  insertHtml(`<video controls src="${await readAsDataUrl(file)}" style="max-width:100%"></video>`);
}

export function videoLinkHtml(url: string) {
  const safe = escapeHtml(url);
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) {
    return `<a href="${safe}" target="_blank" rel="noopener" style="display:inline-block;position:relative;max-width:100%">`
      + `<img src="https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg" alt="YouTube video" style="display:block;max-width:100%">`
      + '<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:50%;'
      + 'background:rgba(0,0,0,.7);color:#fff;font-size:28px;display:flex;align-items:center;justify-content:center">▶</span></a>';
  }
  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) return `<video controls src="${safe}" style="max-width:100%"></video>`;
  return `<a href="${safe}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 14px;border:1px solid #c8c6c4;border-radius:6px;text-decoration:none">▶ ${safe}</a>`;
}

const firstImage = (files?: FileList | null) => [...(files ?? [])].find((f) => f.type.startsWith("image/"));
const report = (err: Error) => notify(err.message, "error");

onPageReady((doc) => {
  doc.addEventListener("paste", (e) => {
    const file = firstImage(e.clipboardData?.files);
    if (!file) return;
    e.preventDefault();
    insertImageFile(file).catch(report);
  });
  doc.addEventListener("dragover", (e) => {
    if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
  });
  doc.addEventListener("drop", (e) => {
    const file = firstImage(e.dataTransfer?.files);
    if (!file) return;
    e.preventDefault();
    const range = doc.caretRangeFromPoint(e.clientX, e.clientY);
    const sel = doc.getSelection();
    if (range && sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    insertImageFile(file).catch(report);
  });
});
