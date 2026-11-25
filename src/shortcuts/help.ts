import { createStore } from "../store/store";

export const helpStore = createStore(false);
export const openHelp = () => helpStore.set(true);
export const closeHelp = () => helpStore.set(false);
