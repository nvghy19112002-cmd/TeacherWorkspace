import { z } from 'zod';
import { useWorkspace } from '../../../app/store';

export const keyStatusSchema = z.enum([
  'unchecked',
  'active',
  'auth_error',
  'quota',
  'network_error',
]);
export const keyMetaSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().trim().min(1).max(100),
  masked: z.string().max(20),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
  status: keyStatusSchema,
  lastCheckedAt: z.string().datetime().nullable(),
});
export type KeyMeta = z.infer<typeof keyMetaSchema>;
export const keyPoolSchema = z.object({
  version: z.literal(1),
  automatic: z.boolean(),
  activeId: z.string().nullable(),
  keys: z.array(keyMetaSchema).max(100),
});
export type KeyPool = z.infer<typeof keyPoolSchema>;
export const emptyKeyPool = (): KeyPool => ({ version: 1, automatic: false, activeId: null, keys: [] });

export function readKeyPool(raw?: string): KeyPool {
  return raw ? keyPoolSchema.parse(JSON.parse(raw) as unknown) : emptyKeyPool();
}

export async function saveKeyPool(recipe: (pool: KeyPool) => KeyPool): Promise<void> {
  await useWorkspace.getState().commit((snapshot) => {
    const next = keyPoolSchema.parse(recipe(readKeyPool(snapshot.settings.moduleState?.aiKeyPool)));
    return {
      ...snapshot,
      settings: {
        ...snapshot.settings,
        moduleState: {
          ...snapshot.settings.moduleState,
          aiKeyPool: JSON.stringify(next),
        },
      },
    };
  });
}

export function orderedKeys(pool: KeyPool): KeyMeta[] {
  return [...pool.keys].filter((key) => key.enabled).sort((a, b) => a.priority - b.priority);
}
