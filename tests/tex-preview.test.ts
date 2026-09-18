import { describe, expect, it } from 'vitest';
import {
  prepareTexPreview,
  questionErrorLine,
} from '../src/modules/question-bank/domain/texPreview';

const setup = String.raw`\documentclass{article}
\usepackage{tikz}
\input{setting/caidat.tex}
\begin{document}
\input{data/full-exam.tex}
\end{document}`;

describe('TeX Live preview preparation', () => {
  it('preserves the complete original question and TikZ, using only the original preamble', () => {
    const source = String.raw`\begin{ex}%[0D1N1-1]
Draw $x^2$. \begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}
\loigiai{Nested {content}.}
\end{ex}`;
    const result = prepareTexPreview(source, setup);
    expect(result.question).toBe(source);
    expect(result.sourceLineOffset).toBe(0);
    expect(result.document).toContain('\\input{setting/caidat.tex}');
    expect(result.document).not.toContain('full-exam');
    expect(result.document).toContain('\\input{question.tex}');
  });
  it('adds a document class for a setup-only file and ex wrapper only for an unwrapped question', () => {
    const result = prepareTexPreview('$x+1$', '\\usepackage{ex_test}');
    expect(result.document).toContain('\\documentclass[12pt,a4paper]{article}');
    expect(result.question).toBe('\\begin{ex}\n$x+1$\n\\end{ex}');
    expect(result.sourceLineOffset).toBe(1);
  });
  it('does not take begin document from a comment as the preamble boundary', () => {
    const result = prepareTexPreview('Question', '% \\begin{document}\n\\usepackage{ex_test}');
    expect(result.document).toContain('\\usepackage{ex_test}');
  });
  it('refuses multiple questions, whole exams, dangling environments and code outside ex', () => {
    for (const source of [
      '\\begin{ex}A\\end{ex}\\begin{ex}B\\end{ex}',
      '\\begin{document}A\\end{document}',
      '\\begin{ex}A',
      '\\newcommand{\\x}{1}\\begin{ex}A\\end{ex}',
    ]) {
      expect(() => prepareTexPreview(source, setup)).toThrow();
    }
  });
  it('does not silently remove unsupported macros', () => {
    const source = '\\begin{ex}\\myCustomDrawing{A}\\end{ex}';
    expect(prepareTexPreview(source, setup).question).toBe(source);
  });
  it('maps file-line errors only for the question file, not setup errors', () => {
    expect(questionErrorLine('./question.tex:8: Undefined control sequence.', 1)).toBe(7);
    expect(questionErrorLine('C:\\tmp\\question.tex:12: Error', 0)).toBe(12);
    expect(questionErrorLine('./setting/caidat.tex:8: Error', 0)).toBeNull();
  });
});
