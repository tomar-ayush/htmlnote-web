import { notify } from "../dialog/dialog";
import { editorStore } from "../editor/editor";
import { Icon, type IconName } from "../ui/icons";
import { Btn, Group, NativeInput } from "../ui/ui";
import { cellColor, tableOp, type TableOp } from "./tables";

const OPS: [TableOp, IconName, string, string][] = [
  ["row-above", "rowAbove", "Row above", "Insert a row above"],
  ["row-below", "rowBelow", "Row below", "Insert a row below"],
  ["col-left", "colLeft", "Col left", "Insert a column to the left"],
  ["col-right", "colRight", "Col right", "Insert a column to the right"],
  ["merge-right", "merge", "Merge", "Merge with the cell on the right"],
  ["split", "split", "Split", "Split a merged cell"],
  ["del-row", "delRow", "Del row", "Delete this row"],
  ["del-col", "delCol", "Del col", "Delete this column"],
  ["del-table", "delTable", "Del table", "Delete the whole table"],
];

const needCell = (done: boolean) => {
  if (!done) notify("Click inside a table cell first.");
};

export function TableTools() {
  const { doc } = editorStore.use();
  return (
    <Group label="Table tools">
      {OPS.map(([op, icon, label, title]) => (
        <Btn key={op} title={title} disabled={!doc} onClick={() => needCell(tableOp(op))}>
          <Icon name={icon} /> {label}
        </Btn>
      ))}
      <label className="swatch" title="Cell color">
        <span className="swatch-letter">Cell</span>
        <NativeInput type="color" value="#fff2cc" onCommit={(v) => needCell(cellColor(v))} />
      </label>
    </Group>
  );
}
