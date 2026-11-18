import { notify } from "../dialog/dialog";
import { editorStore } from "../editor/editor";
import { Btn, Group, NativeInput } from "../ui/ui";
import { cellColor, tableOp, type TableOp } from "./tables";

const OPS: [TableOp, string, string][] = [
  ["row-above", "Row above", "Insert a row above"],
  ["row-below", "Row below", "Insert a row below"],
  ["col-left", "Col left", "Insert a column to the left"],
  ["col-right", "Col right", "Insert a column to the right"],
  ["merge-right", "Merge right", "Merge with the cell on the right"],
  ["split", "Split", "Split a merged cell"],
  ["del-row", "Delete row", "Delete this row"],
  ["del-col", "Delete col", "Delete this column"],
  ["del-table", "Delete table", "Delete the whole table"],
];

const needCell = (done: boolean) => {
  if (!done) notify("Click inside a table cell first.");
};

export function TableTools() {
  const { doc } = editorStore.use();
  return (
    <Group label="Table tools">
      {OPS.map(([op, label, title]) => (
        <Btn key={op} title={title} disabled={!doc} onClick={() => needCell(tableOp(op))}>
          {label}
        </Btn>
      ))}
      <label className="swatch" title="Cell color">
        <span className="swatch-letter">Cell</span>
        <NativeInput type="color" value="#fff2cc" onCommit={(v) => needCell(cellColor(v))} />
      </label>
    </Group>
  );
}
