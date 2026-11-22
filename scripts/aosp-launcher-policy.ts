import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Reviewed source of the privileged launcher's agent IPC policy. */
export const LAUNCHER_POLICY_SOURCE = 'android/aosp/launcher-policy/alpha_launcher_agent_ipc.te';
/**
 * The include added to the staged product.mk. A literal path, as the staged telephony defaults use:
 * a lazily expanded $(MAKEFILE_LIST) here would resolve after inherit-product, to another makefile.
 */
export const LAUNCHER_POLICY_PRODUCT_INCLUDE =
  '\n# The privileged launcher\'s local agent socket in its own private data (alpha_launcher_agent_ipc.te).\n' +
  'SYSTEM_EXT_PRIVATE_SEPOLICY_DIRS += vendor/alphaphone/sepolicy\n';

/**
 * Stage the priv_app socket-file policy beside a privileged launcher. Only ever the reviewed bytes,
 * written once; a stage that already carries a sepolicy directory is refused rather than merged.
 */
export function stageLauncherAgentIpcPolicy(output: string, root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')) {
  const bytes = fs.readFileSync(path.join(root, LAUNCHER_POLICY_SOURCE));
  const directory = path.join(output, 'sepolicy');
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, path.basename(LAUNCHER_POLICY_SOURCE)), bytes, { flag: 'wx' });
  fs.appendFileSync(path.join(output, 'product.mk'), LAUNCHER_POLICY_PRODUCT_INCLUDE);
  return bytes;
}
