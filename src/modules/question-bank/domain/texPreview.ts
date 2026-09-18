import { maskComments } from './latex';
import { parseExTest } from './parser';

export interface PreparedPreview {
  document: string;
  question: string;
  sourceLineOffset: number;
}

/** Construct disposable preview files; never rewrite the saved question. */
export function prepareTexPreview(raw: string, setup: string): PreparedPreview {
  if (!raw.trim()) throw new Error('Câu hỏi trống.');
  const clean = maskComments(raw);
  if (/\\(?:documentclass\b|begin\s*\{document\}|end\s*\{document\})/.test(clean))
    throw new Error(
      'Hãy nhập/tách đề thành từng câu trước khi xem trước; không biên dịch cả đề tại đây.',
    );
  const parsed = parseExTest(raw);
  if (parsed.length !== 1) throw new Error('Chọn đúng một câu hỏi để biên dịch.');
  const wrapped = /\\begin\{ex\}/.test(clean);
  if (wrapped && maskComments(raw).trim() !== maskComments(parsed[0].rawSource).trim())
    throw new Error(
      'Có lệnh ngoài môi trường ex. Hãy đưa lệnh thiết lập vào bộ khai báo trước khi xem trước.',
    );
  const setupClean = maskComments(setup);
  const begin = /\\begin\s*\{document\}/.exec(setupClean);
  const preamble = begin ? setup.slice(0, begin.index) : setup;
  if (!preamble.trim())
    throw new Error('Bộ khai báo trống. Chọn main.tex hoặc file khai báo của anh.');
  if (/\\end\s*\{document\}/.test(maskComments(preamble)))
    throw new Error('Bộ khai báo có lệnh kết thúc tài liệu không hợp lệ.');
  const documentClass = /\\documentclass\b/.test(maskComments(preamble))
    ? ''
    : '\\documentclass[12pt,a4paper]{article}\n';
  const question = wrapped ? raw : `\\begin{ex}\n${raw}\n\\end{ex}`;
  return {
    question,
    sourceLineOffset: wrapped ? 0 : 1,
    document: `${documentClass}${preamble}\n
% Preview-only overrides. All source files remain untouched.
\\AtBeginDocument{%
  \\ifdefined\\Opensolutionfile\\RenewDocumentCommand{\\Opensolutionfile}{m o}{}\\fi
  \\ifdefined\\Closesolutionfile\\RenewDocumentCommand{\\Closesolutionfile}{m}{}\\fi
}
\\begin{document}
\\input{question.tex}
\\end{document}
`,
  };
}

export function questionErrorLine(log: string, offset: number): number | null {
  const match = /(?:^|[\s/\\])question\.tex:(\d+):/m.exec(log);
  if (!match) return null;
  const line = Number(match[1]) - offset;
  return line > 0 ? line : null;
}
