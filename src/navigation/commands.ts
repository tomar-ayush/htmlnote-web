export type NavCommand = "newPage" | "newNotebook" | "movePageUp" | "movePageDown";

let commands: Record<NavCommand, () => void> | null = null;

export function setNavCommands(next: Record<NavCommand, () => void> | null) {
  commands = next;
}

export function runNavCommand(name: NavCommand) {
  commands?.[name]?.();
}
