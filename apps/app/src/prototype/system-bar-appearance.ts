import type { SystemBarsPort } from '../native/alpha-device';

/** Android draws its status and navigation icons from the system night mode; Alpha's own theme
 * can differ. The shell's drawn theme (saved state, else the theme it started with) is sent on
 * mount and on every change: light icons on dark, dark icons on light. A reload sends it again. */
export function installSystemBarAppearance(Component: any, native: boolean, bars: SystemBarsPort) {
  if (!native) return;
  let sent: string | undefined;
  const sync = (shell: { state: { theme?: unknown }; props: { theme?: unknown } }) => {
    const theme = shell.state.theme || shell.props.theme;
    if ((theme !== 'light' && theme !== 'dark') || theme === sent) return;
    sent = theme;
    void bars.setSystemBarAppearance({ dark: theme === 'dark' }).catch(() => { if (sent === theme) sent = undefined; });
  };
  const p = Component.prototype, mount = p.componentDidMount, update = p.componentDidUpdate;
  p.componentDidMount = function (...args: unknown[]) { mount.apply(this, args); sync(this); };
  p.componentDidUpdate = function (...args: unknown[]) { update.apply(this, args); sync(this); };
}
