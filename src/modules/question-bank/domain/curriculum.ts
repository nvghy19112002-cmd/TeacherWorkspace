import { z } from 'zod';
import { curriculumNodeSchema, learningOutcomeSchema, type BankSnapshot } from './model';

export const curriculumFileSchema = z
  .object({
    application: z.literal('TeacherWorkspace'),
    type: z.literal('curriculum'),
    schemaVersion: z.literal(1),
    exportedAt: z.string().datetime().optional(),
    nodes: z.array(curriculumNodeSchema).max(10000),
    learningOutcomes: z.array(learningOutcomeSchema).max(30000),
  })
  .superRefine((value, ctx) => {
    const ids = new Set(value.nodes.map((node) => node.id));
    if (ids.size !== value.nodes.length)
      ctx.addIssue({ code: 'custom', message: 'Cây chương trình có ID trùng.' });
    if (value.nodes.some((node) => node.parentId && !ids.has(node.parentId)))
      ctx.addIssue({ code: 'custom', message: 'Có nút cha không tồn tại.' });
    if (value.learningOutcomes.some((outcome) => !ids.has(outcome.nodeId)))
      ctx.addIssue({ code: 'custom', message: 'Yêu cầu cần đạt trỏ tới nút không tồn tại.' });
  });

export function serializeCurriculum(snapshot: BankSnapshot): string {
  return JSON.stringify(
    {
      application: 'TeacherWorkspace',
      type: 'curriculum',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      nodes: snapshot.curriculumNodes,
      learningOutcomes: snapshot.learningOutcomes,
    },
    null,
    2,
  );
}

export function parseCurriculum(text: string) {
  if (new TextEncoder().encode(text).length > 10 * 1024 * 1024)
    throw new Error('Tệp cây chương trình vượt quá 10 MB.');
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Không đọc được JSON cây chương trình.');
  }
  return curriculumFileSchema.parse(value);
}

export const PARENT_KIND: Record<z.infer<typeof curriculumNodeSchema>['kind'], string | null> = {
  grade: null,
  domain: 'grade',
  chapter: 'domain',
  lesson: 'chapter',
  form: 'lesson',
};

export function curriculumPath(snapshot: BankSnapshot, nodeId: string | null): string {
  if (!nodeId) return '';
  const byId = new Map(snapshot.curriculumNodes.map((node) => [node.id, node]));
  const names: string[] = [];
  let current = byId.get(nodeId);
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names.join(' › ');
}
