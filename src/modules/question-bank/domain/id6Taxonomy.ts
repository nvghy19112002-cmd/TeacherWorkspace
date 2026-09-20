import taxonomy from '../data/id6-thcs-thpt.json';

interface Node {
  code: string;
  name: string;
  children?: Node[];
}

export interface Id6Inspection {
  sourceId: string;
  classificationCode: string;
  level: 'N' | 'H' | 'V' | 'C' | null;
  state: 'valid' | 'partial' | 'invalid';
  path: string[];
  message: string;
}

const roots: Node[] = taxonomy.nodes;
const levels = new Set(taxonomy.levels.map((item) => item.code));

/** Read the supplied ID6 taxonomy independently of the app's editable KNTT tree. */
export function inspectId6(sourceId: string): Id6Inspection {
  const original = sourceId.trim();
  const code = original.replace(/-\d{3,}$/, '').toUpperCase();
  const match = /^([0-9])([A-Z])(\d+)([A-Z])(\d+)-(\d+)$/.exec(code);
  const level = match && levels.has(match[4]) ? (match[4] as Id6Inspection['level']) : null;
  const base = { sourceId: original, classificationCode: code, level, path: [] as string[] };
  if (!match || !level)
    return {
      ...base,
      state: 'invalid',
      message: 'ID6 sai cấu trúc hoặc mức độ chưa có trong cây.',
    };

  const grade = roots.find((node) => node.code === match[1]);
  const domain = grade?.children?.find((node) => node.code === match[2]);
  if (!grade || !domain)
    return {
      ...base,
      state: 'invalid',
      message: 'Lớp hoặc mạch kiến thức không có trong cây ID6.',
    };
  const chapter = domain.children?.find((node) => node.code === match[3]);
  const lesson = chapter?.children?.find((node) => node.code === match[5]);
  const form = lesson?.children?.find((node) => node.code === match[6]);
  const path = [grade, domain, chapter, lesson, form]
    .filter((node): node is Node => !!node)
    .map((node) => node.name);
  if (form) return { ...base, state: 'valid', path, message: 'ID6 khớp cây phân loại.' };
  if (lesson && !lesson.children?.length)
    return {
      ...base,
      state: 'partial',
      path,
      message: 'Cây ID6 chưa khai báo dạng cho bài này; cần phân loại thủ công.',
    };
  return {
    ...base,
    state: 'invalid',
    path,
    message: 'Chương, bài hoặc dạng không có trong cây ID6.',
  };
}

/** Only read bracketed IDs in the question header, never in an answer or solution. */
export function sourceIdCandidates(source: string): string[] {
  const header = source.split(/\\choice(?:TF)?\b|\\shortans\b|\\loigiai\b/)[0];
  return [...header.matchAll(/(?:%\s*|\\begin\{ex\}\s*)\[([^\]\r\n]{1,80})\]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}
