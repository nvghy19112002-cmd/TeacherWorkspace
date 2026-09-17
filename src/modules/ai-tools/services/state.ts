import { useWorkspace } from '../../../app/store';
import { aiStateSchema, emptyAiState, type AiState } from '../domain/model';
export function readAiState(raw?: string): AiState {
  return raw ? aiStateSchema.parse(JSON.parse(raw) as unknown) : emptyAiState();
}
export async function saveAiState(recipe: (state: AiState) => AiState): Promise<void> {
  await useWorkspace.getState().commit((snapshot) => {
    const next = aiStateSchema.parse(recipe(readAiState(snapshot.settings.moduleState?.aiTools)));
    const text = JSON.stringify(next);
    if (text.length > 190000)
      throw new Error('Bộ dữ liệu AI quá lớn. Hãy xuất và xóa bớt lịch sử hoặc prompt.');
    return {
      ...snapshot,
      settings: {
        ...snapshot.settings,
        moduleState: { ...snapshot.settings.moduleState, aiTools: text },
      },
    };
  });
}
