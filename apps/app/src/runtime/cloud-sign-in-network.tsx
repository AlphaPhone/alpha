import { useEffect, useState } from 'react';
import { DailyApps } from '../daily';
import { isAndroid, launcherListens, System } from '../native';
import { registerPlugin } from '../platform-plugins';
import { readNativeNetworkStatus, type NativeNetworkStatus } from './native-network';

const device = registerPlugin<{openSettings(input: {page: 'wifi'}): Promise<{status: string}>}>('AlphaDevice');

/** Use local network facts; the browser's online flag cannot say which Android radio is in use. */
export function useCloudSignInNetwork(active: boolean) {
  const [status, setStatus] = useState<NativeNetworkStatus>();
  useEffect(() => {
    if (!active) { setStatus(undefined); return; }
    let disposed = false;
    let observation: AbortController | undefined;
    const refresh = () => {
      if (disposed || document.hidden) return;
      observation?.abort();
      if (!isAndroid) { setStatus({connected: navigator.onLine}); return; }
      const read = observation = new AbortController();
      void readNativeNetworkStatus(() => System.getNetworkStatus(), read.signal).then(value => {
        if (!read.signal.aborted) setStatus(value ?? {});
      }).catch(() => {});
    };
    const network = isAndroid && launcherListens ? System.addListener('networkStatusChanged', refresh).catch(() => null) : null;
    const resumed = isAndroid ? DailyApps.addListener('appResumed', refresh).catch(() => null) : null;
    const windowEvents = ['online', 'offline', 'focus', 'pageshow'];
    for (const event of windowEvents) window.addEventListener(event, refresh);
    document.addEventListener('visibilitychange', refresh);
    refresh();
    return () => {
      disposed = true;
      observation?.abort();
      for (const event of windowEvents) window.removeEventListener(event, refresh);
      document.removeEventListener('visibilitychange', refresh);
      for (const listener of [network, resumed]) void listener?.then(handle => handle?.remove()).catch(() => {});
    };
  }, [active]);

  const offline = status?.connected === false;
  const wifiMissing = status?.wifiActive === false;
  const unvalidated = status?.internetValidated === false;
  const reachable = status?.connected === true && (!isAndroid || status.internetValidated === true);
  let message = '';
  if (offline) message = isAndroid ? 'You’re offline. Connect to Wi-Fi to sign in.' : 'You’re offline. Connect to the internet to sign in.';
  else if (wifiMissing) message = unvalidated
    ? 'Sign-in isn’t using Wi-Fi. Android couldn’t verify internet access.'
    : 'Sign-in isn’t using Wi-Fi. You can use mobile data or connect to Wi-Fi.';
  else if (unvalidated) message = 'Android couldn’t verify internet access. Sign-in needs an internet connection.';
  return {checking: active && status === undefined, offline, unvalidated, reachable, notice: message && <NetworkNotice message={message} />};
}

function NetworkNotice({message}: {message: string}) {
  const [error, setError] = useState(false);
  const openSettings = async () => {
    setError(false);
    try { setError((await device.openSettings({page: 'wifi'})).status !== 'opened'); }
    catch { setError(true); }
  };
  return <aside className="alpha-auth-network" aria-label="Sign-in connection">
    <p role="status">{message}</p>
    {isAndroid && <button type="button" className="alpha-btn alpha-btn--text" onClick={() => void openSettings()}>Open Wi-Fi settings</button>}
    {error && <p role="alert">Couldn’t open Wi-Fi settings.</p>}
  </aside>;
}
