/** Overlays the saved development state on the simulator. Invalid JSON refuses the workflow read. */
export function readWorkflowAppState(api: Record<string, any>, name: string) {
  return {...api.get(name), ...JSON.parse(localStorage.getItem('alpha.dev.app.' + name) || '{}')};
}
