import { createWorkspace } from '../src/core/workspaces';
import { addWork, type WorkDraft } from '../src/modules/schedule/domain/commands';
import { emptySnapshot, type Snapshot } from '../src/modules/schedule/domain/model';
export const BASE_DRAFT: WorkDraft = {
  title: '10A1',
  description: '',
  category: 'teaching',
  location: 'P.201',
  color: '#247568',
  weekdays: [0, 2, 4],
  startTime: '17:45',
  endTime: '19:15',
  startDate: '2026-09-07',
  endDate: null,
  recurrenceType: 'weekly',
  intervalWeeks: 1,
};
export function fixture(patch: Partial<WorkDraft> = {}): Snapshot {
  const base = createWorkspace(emptySnapshot(), 'Học kỳ I');
  return addWork(base, base.settings.activeWorkspaceId!, { ...BASE_DRAFT, ...patch });
}
