import type { RegionalOptions } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/regional-provider.ts';
import type { NavigationBridge } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/background-navigation.ts';

/**
 * AlphaMapsTransportPlugin: the regional gateway transport, the background navigation and arrival notices, and
 * the one-shot "open navigation" flag a notice tap leaves for the Maps view.
 */
export type AlphaMapsTransportPlugin = RegionalOptions['transport'] & NavigationBridge & {
  consumeNavigationOpen(): Promise<{ open: boolean }>;
  clearNavigationOpen(): Promise<void>;
  /** Posts the arrival notice when guidance ends while the launcher is in the background. */
  navigationArrived(input: { title: string; text: string }): Promise<{ shown: boolean }>;
};
