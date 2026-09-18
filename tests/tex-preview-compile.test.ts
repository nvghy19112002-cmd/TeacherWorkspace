import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { prepareTexPreview } from '../src/modules/question-bank/domain/texPreview';

// Native TeX fixture is optional on CI; it never substitutes a mock result.
const hasTex = spawnSync('pdflatex', ['--version'], { timeout: 5000 }).status === 0;
it.skipIf(!hasTex)(
  'compiles the generated wrapper with real TikZ and project-relative input',
  () => {
    const root = mkdtempSync(join(tmpdir(), 'teacher tex test '));
    try {
      const project = join(root, 'project');
      const work = join(root, 'temporary');
      mkdirSync(project);
      mkdirSync(work);
      writeFileSync(
        join(project, 'drawing.tex'),
        '\\begin{tikzpicture}\\draw[->] (0,0)--(2,1);\\end{tikzpicture}',
      );
      const raw = String.raw`\begin{ex}
$x^2+1$\input{drawing.tex}
\end{ex}`;
      const result = prepareTexPreview(
        raw,
        String.raw`\documentclass{article}
\usepackage{tikz}
\newenvironment{ex}{\par Question: }{\par}
\begin{document}
This text must not appear.
\end{document}`,
      );
      writeFileSync(join(work, 'preview.tex'), result.document);
      writeFileSync(join(work, 'question.tex'), result.question);
      const compile = spawnSync(
        'pdflatex',
        [
          '-no-shell-escape',
          '-interaction=nonstopmode',
          '-halt-on-error',
          '-file-line-error',
          'preview.tex',
        ],
        {
          cwd: work,
          timeout: 30000,
          env: {
            ...process.env,
            TEXINPUTS: `.${delimiter}${project}//${delimiter}`,
            openout_any: 'p',
          },
          encoding: 'utf8',
        },
      );
      expect(compile.status, compile.stdout + compile.stderr).toBe(0);
      expect(readFileSync(join(work, 'preview.pdf')).subarray(0, 5).toString()).toBe('%PDF-');
      expect(readFileSync(join(work, 'question.tex'), 'utf8')).toBe(raw);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);

it.skipIf(!hasTex)('compiles the integrated preset without a user main.tex', () => {
  const work = mkdtempSync(join(tmpdir(), 'teacher integrated tex '));
  try {
    const raw = String.raw`\begin{ex}
Preview $x^2+1$.\choice{1}{2}{\True 3}{4}
\begin{tikzpicture}\draw[->] (0,0)--(2,1);\end{tikzpicture}
\loigiai{Test solution.}
\end{ex}`;
    const result = prepareTexPreview(raw, '', { integrated: true });
    writeFileSync(join(work, 'preview.tex'), result.document);
    writeFileSync(join(work, 'question.tex'), result.question);
    const compile = spawnSync(
      'pdflatex',
      [
        '-no-shell-escape',
        '-interaction=nonstopmode',
        '-halt-on-error',
        '-file-line-error',
        'preview.tex',
      ],
      { cwd: work, timeout: 30000, encoding: 'utf8' },
    );
    expect(compile.status, compile.stdout + compile.stderr).toBe(0);
    expect(readFileSync(join(work, 'preview.pdf')).subarray(0, 5).toString()).toBe('%PDF-');
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
