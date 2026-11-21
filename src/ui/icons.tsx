import type { ReactNode } from "react";

const PATHS = {
  storage: (
    <>
      <ellipse cx="8" cy="4" rx="5.5" ry="2" />
      <path d="M2.5 4v4c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V4" />
      <path d="M2.5 8v4c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2V8" />
    </>
  ),
  logout: (
    <>
      <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" />
      <path d="M10.5 11.5 14 8l-3.5-3.5" />
      <path d="M14 8H6" />
    </>
  ),
  save: (
    <>
      <path d="M3 2.5h8l2.5 2.5v8.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
      <path d="M5.5 2.5v3.5h4.5V2.5" />
      <path d="M5 14v-4.5h6V14" />
    </>
  ),
  plus: <path d="M8 3v10M3 8h10" />,
  upload: (
    <>
      <path d="M8 10.5V2.5" />
      <path d="M4.5 6 8 2.5 11.5 6" />
      <path d="M2.5 11v2.5h11V11" />
    </>
  ),
  external: (
    <>
      <path d="M9.5 2.5h4v4" />
      <path d="M13.5 2.5 7.5 8.5" />
      <path d="M12.5 9v3.5a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1H7" />
    </>
  ),
  download: (
    <>
      <path d="M8 2.5v8" />
      <path d="M4.5 7.5 8 11l3.5-3.5" />
      <path d="M2.5 11.5v2h11v-2" />
    </>
  ),
  restore: (
    <>
      <path d="M3 4v3.5h3.5" />
      <path d="M3.4 7.5a5 5 0 1 1 1.1 4.1" />
      <path d="M8 5.2V8l2 1.2" />
    </>
  ),
  tabHome: (
    <>
      <path d="M2.5 7.5 8 2.5l5.5 5" />
      <path d="M4 6.5v6.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V6.5" />
    </>
  ),
  tabInsert: (
    <>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="M8 5.2v5.6M5.2 8h5.6" />
    </>
  ),
  tabDraw: (
    <>
      <path d="M11.5 2.5 13.5 4.5 5.5 12.5l-3 .7.7-3z" />
      <path d="M9.8 4.2 11.8 6.2" />
    </>
  ),
  tabDesign: (
    <>
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
      <circle cx="5.5" cy="4.5" r="1.4" fill="currentColor" />
      <circle cx="10.5" cy="8" r="1.4" fill="currentColor" />
      <circle cx="6.5" cy="11.5" r="1.4" fill="currentColor" />
    </>
  ),
  tabHistory: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 4.8V8l2.2 1.5" />
    </>
  ),
  undo: (
    <>
      <path d="M4 6.5H10a3.5 3.5 0 0 1 0 7H8" />
      <path d="M6.5 3.5 3.5 6.5l3 3" />
    </>
  ),
  redo: (
    <>
      <path d="M12 6.5H6a3.5 3.5 0 0 0 0 7h2" />
      <path d="M9.5 3.5 12.5 6.5l-3 3" />
    </>
  ),
  code: <path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9 3.5l-2 9" />,
  clear: (
    <>
      <path d="M4 3.5h8l-2 4.5v5l-4-2V8z" />
      <path d="M11.5 11.5 14 14M14 11.5 11.5 14" />
    </>
  ),
  listBullet: (
    <>
      <circle cx="3" cy="4.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="3" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="3" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <path d="M6 4.5h7.5M6 8h7.5M6 11.5h7.5" />
    </>
  ),
  listNumber: (
    <>
      <path d="M2.5 4.5h1.5v2.5M6 4.5h7.5M2.5 9.5h2l-2 2.5h2M6 8h7.5M6 11.5h7.5" />
    </>
  ),
  outdent: (
    <>
      <path d="M2.5 3.5h11M7 6.5h6.5M7 9.5h6.5M2.5 12.5h11" />
      <path d="M5 6.2 2.5 8 5 9.8" />
    </>
  ),
  indent: (
    <>
      <path d="M2.5 3.5h11M7 6.5h6.5M7 9.5h6.5M2.5 12.5h11" />
      <path d="M2.5 6.2 5 8 2.5 9.8" />
    </>
  ),
  alignLeft: <path d="M2.5 3.5h11M2.5 6.5h7.5M2.5 9.5h11M2.5 12.5h6.5" />,
  alignCenter: <path d="M2.5 3.5h11M4.2 6.5h7.6M2.5 9.5h11M4.8 12.5h6.4" />,
  alignRight: <path d="M2.5 3.5h11M6 6.5h7.5M2.5 9.5h11M7 12.5h6.5" />,
  lineHeight: (
    <>
      <path d="M4 3v10M2.2 4.8 4 3l1.8 1.8M2.2 11.2 4 13l1.8-1.8" />
      <path d="M8 4.5h5.5M8 8h5.5M8 11.5h5.5" />
    </>
  ),
  link: (
    <>
      <path d="M6.5 9.5 9.5 6.5" />
      <path d="M7.5 11.5 6 13a2.8 2.8 0 0 1-4-4l1.5-1.5" />
      <path d="M8.5 4.5 10 3a2.8 2.8 0 0 1 4 4L12.5 8.5" />
    </>
  ),
  unlink: (
    <>
      <path d="M7.5 11.5 6 13a2.8 2.8 0 0 1-4-4l1.5-1.5" />
      <path d="M8.5 4.5 10 3a2.8 2.8 0 0 1 4 4L12.5 8.5" />
      <path d="M3 3l10 10" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </>
  ),
  table: (
    <>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M2 10h12M6.5 2.5v11M10.5 2.5v11" />
    </>
  ),
  rowAbove: (
    <>
      <rect x="2.5" y="7" width="11" height="6.5" rx="1" />
      <path d="M2.5 10.2h11M8 5.2V1.8M6.2 3.4 8 1.8l1.8 1.6" />
    </>
  ),
  rowBelow: (
    <>
      <rect x="2.5" y="2.5" width="11" height="6.5" rx="1" />
      <path d="M2.5 5.8h11M8 10.8v3.4M6.2 12.6 8 14.2l1.8-1.6" />
    </>
  ),
  colLeft: (
    <>
      <rect x="7" y="2.5" width="6.5" height="11" rx="1" />
      <path d="M10.2 2.5v11M5.2 8H1.8M3.4 6.2 1.8 8l1.6 1.8" />
    </>
  ),
  colRight: (
    <>
      <rect x="2.5" y="2.5" width="6.5" height="11" rx="1" />
      <path d="M5.8 2.5v11M10.8 8h3.4M12.6 6.2 14.2 8l-1.6 1.8" />
    </>
  ),
  merge: (
    <>
      <rect x="2" y="3" width="12" height="10" rx="1.2" />
      <path d="M4.5 8h2.8M11.5 8H8.7M6 6.2 7.5 8 6 9.8M10 6.2 8.5 8 10 9.8" />
    </>
  ),
  split: (
    <>
      <rect x="2" y="3" width="12" height="10" rx="1.2" />
      <path d="M8 3v10M5.2 6.2 3.5 8l1.7 1.8M10.8 6.2 12.5 8l-1.7 1.8" />
    </>
  ),
  delRow: (
    <>
      <rect x="2.5" y="4.5" width="11" height="7" rx="1" />
      <path d="M6 2.5l4 11M10 2.5l-4 11" />
    </>
  ),
  delCol: (
    <>
      <rect x="4.5" y="2.5" width="7" height="11" rx="1" />
      <path d="M2.5 6l11 4M2.5 10l11-4" />
    </>
  ),
  delTable: (
    <>
      <rect x="2" y="3" width="8" height="8" rx="1" />
      <path d="M2 6h8M6 3v8M11 10.5l3.5 3.5M14.5 10.5 11 14" />
    </>
  ),
  image: (
    <>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <circle cx="5.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <path d="M2.5 11.5 6 8l2.5 2.5L10.5 9l3 2.5" />
    </>
  ),
  video: (
    <>
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="M6.5 6l4 2-4 2z" fill="currentColor" stroke="none" />
    </>
  ),
  videoLink: (
    <>
      <rect x="1.8" y="3.5" width="9.5" height="9" rx="1.5" />
      <path d="M11.3 6.5 14.5 4.8v6.4l-3.2-1.7" />
    </>
  ),
  lineRule: <path d="M2 8h12" />,
  calendar: (
    <>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.8h11M5.5 2v2.5M10.5 2v2.5" />
    </>
  ),
  typeText: <path d="M3.5 3.5h9M8 3.5v9.5M5.5 13h5" />,
  selectCursor: <path d="M3.5 2.5 6.5 13l2-3.8L12.5 7z" />,
  pen: (
    <>
      <path d="M11 2.5 13.5 5 5.5 13H3v-2.5z" />
      <path d="M9.5 4 12 6.5" />
    </>
  ),
  slashLine: <path d="M3 13 13 3" />,
  arrowUpRight: (
    <>
      <path d="M3 13 13 3" />
      <path d="M7.5 3H13v5.5" />
    </>
  ),
  rect: <rect x="2.5" y="3.5" width="11" height="9" rx="1" />,
  circle: <circle cx="8" cy="8" r="5" />,
  labelTag: (
    <>
      <path d="M2.5 4h11M6 4v8.5" />
      <rect x="9" y="8" width="4.5" height="4.5" rx="0.8" />
    </>
  ),
  eraser: (
    <>
      <path d="M8.5 3.5 13 8l-4.5 4.5H4L2 10.5z" />
      <path d="M6 12.5h7.5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 4.5h10M6 4.5V2.8h4v1.7M4.5 4.5l.7 8.8h5.6l.7-8.8" />
    </>
  ),
  inspect: (
    <>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" strokeDasharray="2.5 1.8" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  arrowUp: (
    <>
      <path d="M8 13V3" />
      <path d="M4.2 6.8 8 3l3.8 3.8" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M8 3v10" />
      <path d="M4.2 9.2 8 13l3.8-3.8" />
    </>
  ),
  copy: (
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.2" />
      <path d="M3 10.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1" />
    </>
  ),
  reset: (
    <>
      <path d="M13 4.5V8H9.5" />
      <path d="M12.6 8a5 5 0 1 0-1.2 4" />
    </>
  ),
  share: (
    <>
      <circle cx="12" cy="3.5" r="1.8" />
      <circle cx="4" cy="8" r="1.8" />
      <circle cx="12" cy="12.5" r="1.8" />
      <path d="m5.6 7.1 4.8-2.7M5.6 8.9l4.8 2.7" />
    </>
  ),
  check: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
  drive: (
    <>
      <path d="M6 2.5h4l4 7h-4z" />
      <path d="M2 9.5 6 2.5l2 3.5L4 13z" />
      <path d="M4 13h8l2-3.5H6z" />
    </>
  ),
  grip: (
    <>
      <circle cx="5.5" cy="4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 15 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
