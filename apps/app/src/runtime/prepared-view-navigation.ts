/** Only the existing plain, owner-scoped navigation preparation may cross the bridge. */
export function isPreparedViewNavigationRequest(path: string, body: unknown, method = 'POST'): boolean {
  if (method !== 'POST' || typeof path !== 'string' || /[\x00-\x20\x7f%?#\\]/.test(path) || /^\/api\/views\/[A-Za-z0-9_-]+\/navigate$/.exec(path)?.[0] !== path || !body || typeof body !== 'object' || Array.isArray(body)) return false;
  const value = body as Record<string, unknown>;
  return Object.keys(value).length === 5 && Object.keys(value).every(key => ['clientId', 'delivery', 'prepareOnly', 'viewType', 'completedActionHandoffId'].includes(key)) &&
    value.delivery === 'completed-action' && value.prepareOnly === true && value.viewType === 'gui' &&
    typeof value.clientId === 'string' && /^[A-Za-z0-9._-]{1,128}$/.exec(value.clientId)?.[0] === value.clientId &&
    typeof value.completedActionHandoffId === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.exec(value.completedActionHandoffId)?.[0] === value.completedActionHandoffId;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

/** Carries the host's prepared binding into the existing verified renderer claim path. */
export function normalizeTurnViewResults(results: readonly unknown[]): readonly unknown[] {
  return results.map(result => {
    const frame = recordOf(result);
    if (!frame || !Object.hasOwn(frame, 'preparedNavigation')) return result;
    const ordinary = { action: frame.action, data: frame.data };
    if (frame.action !== 'VIEWS') return ordinary;
    const prepared = recordOf(frame.preparedNavigation);
    const binding = recordOf(prepared?.binding);
    if (!prepared || !binding || Object.keys(prepared).length !== 3 || Object.keys(binding).length !== 5) return ordinary;

    const { requestId, clientId, viewId, viewType, installationId } = binding;
    const { viewPath, label } = prepared;
    if (typeof requestId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId) ||
        typeof clientId !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(clientId) ||
        typeof viewId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(viewId) || viewType !== 'gui' ||
        typeof installationId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(installationId) ||
        typeof viewPath !== 'string' || !viewPath.startsWith('/') || viewPath.startsWith('//') ||
        viewPath.length > 512 || /[\x00-\x20\x7f\\]/.test(viewPath) ||
        typeof label !== 'string' || label.trim() === '' || label.length > 256) return ordinary;

    return {
      ...ordinary, actionName: 'VIEWS', success: true,
      values: {
        mode: 'show', viewId, viewPath, viewType, label, completedActionDelivered: false,
        completedActionHandoffId: requestId, navigationPrepared: true,
        navigationBinding: { requestId, clientId, viewId, viewType, installationId },
      },
    };
  });
}

export function normalizeTurnReply(value: Record<string, unknown>): Record<string, unknown> {
  return Array.isArray(value.actionResults) ? { ...value, actionResults: normalizeTurnViewResults(value.actionResults) } : value;
}
