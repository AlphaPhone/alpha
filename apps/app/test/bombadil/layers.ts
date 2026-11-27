// spec/app/shell/index.md, "Ask Alpha rises to typing, a sheet or the full screen"; spec/app/notices/toasts.md, "Story: Read a toast before it goes"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const shellState = extract(({ document }) => {
  const assistant = document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
  const detent = assistant?.getAttribute("data-alpha-detent") ?? "";
  const drawerOpen = document.querySelector("[role=dialog][aria-label='All apps']") !== null;
  const toasts = document.querySelectorAll("[role=status][data-host-chrome], [data-alpha-toast-region] [role=status]").length;
  const nestedMain = document.querySelectorAll("main main").length;
  return { detent, drawerOpen, toasts, nestedMain };
});

/** Ask Alpha never opens into a raised sheet or full screen while the Apps drawer is open. */
export const assistantNeverCoversDrawer = always(() => !shellState.current.drawerOpen || (shellState.current.detent !== "sheet" && shellState.current.detent !== "full"));

/** At most one transient toast notice is displayed on screen at a time. */
export const atMostOneVisibleToast = always(() => shellState.current.toasts <= 1);
