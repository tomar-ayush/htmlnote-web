import { change, getDoc } from "../editor/editor";

type Cell = HTMLTableCellElement;

function currentCell(): Cell | null {
  const node = getDoc()?.getSelection()?.anchorNode;
  const el = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement;
  return el?.closest<Cell>("td,th") ?? null;
}

function newCell(doc: Document, like: Cell) {
  const cell = doc.createElement(like.tagName.toLowerCase() as "td");
  const style = like.getAttribute("style");
  if (style) cell.setAttribute("style", style);
  cell.style.removeProperty("background");
  cell.style.removeProperty("background-color");
  cell.innerHTML = "<br>";
  return cell;
}

function addRow(doc: Document, cell: Cell, after: boolean) {
  const row = cell.parentElement as HTMLTableRowElement;
  const fresh = doc.createElement("tr");
  [...row.cells].forEach((c) => {
    const n = newCell(doc, c);
    n.colSpan = c.colSpan;
    fresh.append(n);
  });
  if (after) row.after(fresh);
  else row.before(fresh);
}

function addCol(doc: Document, cell: Cell, after: boolean) {
  const i = cell.cellIndex;
  [...cell.closest("table")!.rows].forEach((row) => {
    const ref = row.cells[Math.min(i, row.cells.length - 1)];
    if (!ref) return;
    const n = newCell(doc, ref);
    if (after) ref.after(n);
    else ref.before(n);
  });
}

const ops = {
  "row-above": (doc: Document, cell: Cell) => addRow(doc, cell, false),
  "row-below": (doc: Document, cell: Cell) => addRow(doc, cell, true),
  "col-left": (doc: Document, cell: Cell) => addCol(doc, cell, false),
  "col-right": (doc: Document, cell: Cell) => addCol(doc, cell, true),
  "del-row": (_: Document, cell: Cell) => {
    const table = cell.closest("table")!;
    cell.parentElement!.remove();
    if (!table.rows.length) table.remove();
  },
  "del-col": (_: Document, cell: Cell) => {
    const table = cell.closest("table")!;
    const i = cell.cellIndex;
    [...table.rows].forEach((row) => row.cells[i]?.remove());
    if (![...table.rows].some((row) => row.cells.length)) table.remove();
  },
  "del-table": (_: Document, cell: Cell) => cell.closest("table")!.remove(),
  "merge-right": (_: Document, cell: Cell) => {
    const next = cell.nextElementSibling as Cell | null;
    if (!next) return;
    cell.innerHTML += ` ${next.innerHTML}`;
    cell.colSpan += next.colSpan;
    next.remove();
  },
  split: (doc: Document, cell: Cell) => {
    const extra = cell.colSpan - 1;
    cell.colSpan = 1;
    for (let i = 0; i < extra; i++) cell.after(newCell(doc, cell));
  },
};

export type TableOp = keyof typeof ops;

export function tableOp(name: TableOp) {
  const cell = currentCell();
  if (cell) change((doc) => ops[name](doc, cell));
  return !!cell;
}

export function cellColor(color: string) {
  const cell = currentCell();
  if (cell) change(() => (cell.style.backgroundColor = color));
  return !!cell;
}
