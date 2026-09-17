import type { z } from 'zod';
import type { issueSchema } from './model';
export interface LatexIssue extends z.infer<typeof issueSchema> {
  id: string;
  start: number;
  end: number;
  replacement?: string;
}
// Mask comments and verbatim while preserving source offsets for diagnostics and edits.
export function maskNonCode(source: string): string {
  return source.replace(
    /\\begin\{(verbatim\*?|lstlisting|minted)\}[\s\S]*?(?:\\end\{\1\}|$)|\\verb\*?([^\w\s])[^\n]*?\2|\\[\\%$]|%[^\n]*/g,
    (s) => s.replace(/[^\n]/g, ' '),
  );
}
export function checkLatex(source: string): LatexIssue[] {
  const code = maskNonCode(source);
  const issues: LatexIssue[] = [];
  const add = (
    start: number,
    end: number,
    severity: LatexIssue['severity'],
    message: string,
    suggestion: string,
    replacement?: string,
  ) => {
    issues.push({
      id: `${start}-${issues.length}`,
      start,
      end,
      severity,
      line: source.slice(0, start).split('\n').length,
      message,
      suggestion,
      replacement,
    });
  };
  for (const m of code.matchAll(/\\frac\b/g))
    add(
      m.index,
      m.index + m[0].length,
      'P2',
      'Phân số đang dùng \\frac.',
      'Có thể đổi sang \\dfrac theo quy ước trình bày.',
      '\\dfrac',
    );
  const stack: { name: string; start: number }[] = [];
  for (const m of code.matchAll(/\\(begin|end)\{([^{}]+)\}/g)) {
    if (m[1] === 'begin') stack.push({ name: m[2], start: m.index });
    else if (stack.at(-1)?.name === m[2]) {
      const begin = stack.pop()!;
      if (begin.name === 'ex') {
        const block = code.slice(begin.start, m.index);
        if (!/\\loigiai\b/.test(block))
          add(
            begin.start,
            m.index,
            'P1',
            'Câu chưa có \\loigiai.',
            'Bổ sung lời giải nếu đây là bản dành cho giáo viên.',
          );
        if (/\\choice\b/.test(block)) {
          const options = block.split(/\\choice\b/)[1].split(/\\loigiai\b/)[0];
          const count = [...options.matchAll(/\\True\b/g)].length;
          if (count !== 1)
            add(
              begin.start,
              m.index,
              'P1',
              `Câu choice có ${count} dấu \\True.`,
              'Đối chiếu đáp án; câu một lựa chọn cần đúng một đáp án được đánh dấu.',
            );
        }
      }
    } else
      add(
        m.index,
        m.index + m[0].length,
        'P0',
        `Đóng môi trường ${m[2]} không khớp.`,
        'Kiểm tra thứ tự begin/end.',
      );
  }
  for (const item of stack)
    add(
      item.start,
      item.start,
      'P0',
      `Chưa đóng môi trường ${item.name}.`,
      `Kiểm tra \\end{${item.name}}.`,
    );
  const braces: number[] = [];
  for (const m of code.matchAll(/\\[{}\\]|[{}]/g)) {
    if (m[0] === '{') braces.push(m.index);
    if (m[0] === '}' && braces.pop() === undefined)
      add(m.index, m.index + 1, 'P0', 'Dư dấu ngoặc nhọn đóng.', 'Kiểm tra nhóm lệnh.');
  }
  for (const start of braces)
    add(
      start,
      start + 1,
      'P0',
      'Ngoặc nhọn chưa đóng.',
      'Kiểm tra nhóm lệnh trước khi thêm dấu đóng.',
    );
  const dollars = [...code.matchAll(/(?<!\\)\$/g)];
  if (dollars.length % 2)
    add(
      dollars.at(-1)!.index,
      dollars.at(-1)!.index + 1,
      'P1',
      'Số dấu $ lẻ.',
      'Kiểm tra cặp dấu toán; bộ kiểm tra không thay thế trình biên dịch TeX.',
    );
  for (const m of code.matchAll(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g))
    add(
      m.index,
      m.index + m[0].length,
      'P1',
      `Cần đối chiếu tệp hình: ${m[1]}`,
      'Chưa kiểm tra tệp hình trên ổ đĩa; không thể kết luận hình bị thiếu.',
    );
  for (const m of code.matchAll(/[−×÷≤≥≠]/g))
    add(
      m.index,
      m.index + 1,
      'P2',
      `Ký tự toán Unicode: ${m[0]}`,
      'Kiểm tra engine/font; có thể cần lệnh LaTeX tương ứng.',
    );
  return issues.slice(0, 300);
}
export function applyFix(source: string, issue: LatexIssue): string {
  if (issue.replacement === undefined) return source;
  if (source.slice(issue.start, issue.end) !== '\\frac')
    throw new Error('Nội dung đã thay đổi. Hãy kiểm tra lại trước khi sửa.');
  return source.slice(0, issue.start) + issue.replacement + source.slice(issue.end);
}
export function fixFractions(source: string): string {
  return checkLatex(source)
    .filter((i) => i.replacement !== undefined)
    .reverse()
    .reduce(applyFix, source);
}
