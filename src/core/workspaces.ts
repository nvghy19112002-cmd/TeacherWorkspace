import { emptySnapshot, newId, type Snapshot } from '../modules/schedule/domain/model';
export function createWorkspace(data: Snapshot, name: string, description = ''): Snapshot {
  const id = newId();
  return {
    ...data,
    workspaces: [
      ...data.workspaces,
      { id, name, description, createdAt: new Date().toISOString(), archived: false },
    ],
    settings: { ...data.settings, activeWorkspaceId: id },
  };
}
export function initialSnapshot(): Snapshot {
  return createWorkspace(emptySnapshot(), 'Thời khóa biểu của tôi');
}
export function duplicateWorkspace(data: Snapshot, id: string): Snapshot {
  const source = data.workspaces.find((w) => w.id === id);
  if (!source) throw new Error('Workspace không tồn tại.');
  const next = structuredClone(data);
  const workspaceId = newId();
  next.workspaces.push({
    ...source,
    id: workspaceId,
    name: `${source.name.slice(0, 80)} — bản sao`,
    createdAt: new Date().toISOString(),
    archived: false,
  });
  const items = new Map<string, string>();
  const rules = new Map<string, string>();
  const series = new Map<string, string>();
  for (const w of data.workItems.filter((w) => w.workspaceId === id)) {
    const newItem = newId();
    items.set(w.id, newItem);
    next.workItems.push({ ...w, id: newItem, workspaceId });
  }
  for (const r of data.rules.filter((r) => items.has(r.workItemId))) {
    const ruleId = newId();
    rules.set(r.id, ruleId);
    if (!series.has(r.seriesId)) series.set(r.seriesId, newId());
    next.rules.push({
      ...r,
      id: ruleId,
      seriesId: series.get(r.seriesId)!,
      workItemId: items.get(r.workItemId)!,
    });
  }
  next.exceptions.push(
    ...data.exceptions
      .filter((e) => rules.has(e.ruleId))
      .map((e) => ({ ...e, id: newId(), ruleId: rules.get(e.ruleId)! })),
  );
  next.settings.activeWorkspaceId = workspaceId;
  return next;
}
export function deleteWorkspace(data: Snapshot, id: string): Snapshot {
  const next = structuredClone(data);
  next.workspaces = next.workspaces.filter((w) => w.id !== id);
  next.workItems = next.workItems.filter((w) => w.workspaceId !== id);
  const items = new Set(next.workItems.map((w) => w.id));
  next.rules = next.rules.filter((r) => items.has(r.workItemId));
  const rules = new Set(next.rules.map((r) => r.id));
  next.exceptions = next.exceptions.filter((e) => rules.has(e.ruleId));
  if (next.settings.activeWorkspaceId === id)
    next.settings.activeWorkspaceId = next.workspaces.find((w) => !w.archived)?.id ?? null;
  return next;
}
