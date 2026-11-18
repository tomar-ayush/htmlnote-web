import { useRef, useState } from "react";
import { ask, notify } from "../dialog/dialog";
import { editorStore, escapeHtml, getDoc } from "../editor/editor";
import { insertLink } from "../format/format";
import { TableTools } from "../tables/TableTools";
import { Icon, type IconName } from "../ui/icons";
import { Btn, Group } from "../ui/ui";
import { insertHtml, insertImageFile, insertVideoFile, tableHtml, videoLinkHtml } from "./insert";

const clamp = (value: number, max: number) => Math.min(max, Math.max(1, value || 1));

function FilePick({ accept, icon, label, title, onFile }: { accept: string; icon: IconName; label: string; title: string; onFile: (file: File) => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  const { doc } = editorStore.use();
  return (
    <>
      <Btn title={title} disabled={!doc} onClick={() => ref.current?.click()}><Icon name={icon} /> {label}</Btn>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file).catch((err: Error) => notify(err.message, "error"));
        }}
      />
    </>
  );
}

export function InsertPanel() {
  const { doc } = editorStore.use();
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const videoLink = async () => {
    if (!getDoc()) return;
    const url = await ask("Add a video", { message: "Paste a YouTube, Vimeo or video file link.", input: "https://", confirmText: "Add video" });
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) return notify("Video links must start with http:// or https://.", "error");
    insertHtml(videoLinkHtml(url));
  };

  const today = () =>
    insertHtml(escapeHtml(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })));

  return (
    <>
      <Group label="Table">
        <label>
          Rows <input type="number" min={1} max={50} value={rows} onChange={(e) => setRows(clamp(+e.target.value, 50))} />
        </label>
        <label>
          Cols <input type="number" min={1} max={20} value={cols} onChange={(e) => setCols(clamp(+e.target.value, 20))} />
        </label>
        <Btn title="Insert a table at the cursor" disabled={!doc} onClick={() => insertHtml(tableHtml(rows, cols))}><Icon name="table" /> Insert table</Btn>
      </Group>
      <TableTools />
      <Group label="Media">
        <FilePick accept="image/*" icon="image" label="Image" title="Insert an image from your computer" onFile={insertImageFile} />
        <FilePick accept="video/mp4,video/webm,video/ogg" icon="video" label="Video" title="Insert a video file up to 25 MB" onFile={insertVideoFile} />
        <Btn title="Insert a YouTube, Vimeo or video link" disabled={!doc} onClick={() => void videoLink()}><Icon name="videoLink" /> Video link</Btn>
      </Group>
      <Group label="Other">
        <Btn title="Add link (Ctrl+K)" disabled={!doc} onClick={() => void insertLink()}><Icon name="link" /> Link</Btn>
        <Btn title="Insert a horizontal line" disabled={!doc} onClick={() => insertHtml("<hr>")}><Icon name="lineRule" /> Line</Btn>
        <Btn title="Insert today's date" disabled={!doc} onClick={today}><Icon name="calendar" /> Date</Btn>
      </Group>
    </>
  );
}
