import { maskComments } from './latex';
import { parseExTest } from './parser';

export type TexPreviewMode = 'integrated' | 'hybrid' | 'project';

export interface TexPreviewSettings {
  engine: string;
  executable: string;
  preamblePath: string;
  projectDir: string;
  mode: TexPreviewMode;
  additionalPreamble: string;
}

export interface TexSupportIssue {
  kind: 'command' | 'environment' | 'package';
  token: string;
  message: string;
  suggestion: string;
}

export const DEFAULT_TEX_PREVIEW_SETTINGS: TexPreviewSettings = {
  engine: 'pdflatex',
  executable: '',
  preamblePath: '',
  projectDir: '',
  mode: 'integrated',
  additionalPreamble: '',
};

/** Stable baseline for Vietnamese high-school questions and ex_test/TikZ previews. */
export const INTEGRATED_TEX_PREAMBLE = String.raw`
% Teacher Workspace integrated preview preamble v1
\usepackage{iftex}
\ifPDFTeX
  \IfFileExists{inputenc.sty}{\usepackage[utf8]{inputenc}}{}
  \IfFileExists{t5enc.def}{\usepackage[T5]{fontenc}}{}
  \IfFileExists{vietnamese.ldf}{\usepackage[vietnamese]{babel}}{}
\else
  \IfFileExists{fontspec.sty}{\usepackage{fontspec}}{}
\fi
\usepackage{amsmath,amssymb,mathtools}
\IfFileExists{geometry.sty}{\usepackage[margin=18mm]{geometry}}{}
\IfFileExists{xcolor.sty}{\usepackage{xcolor}}{}
\IfFileExists{graphicx.sty}{\usepackage{graphicx}}{}
\IfFileExists{enumitem.sty}{\usepackage{enumitem}}{}
\IfFileExists{multicol.sty}{\usepackage{multicol}}{}
\IfFileExists{array.sty}{\usepackage{array}}{}
\IfFileExists{tabularx.sty}{\usepackage{tabularx}}{}
\IfFileExists{booktabs.sty}{\usepackage{booktabs}}{}
\IfFileExists{tikz.sty}{\usepackage{tikz}}{}
\IfFileExists{pgfplots.sty}{\usepackage{pgfplots}\pgfplotsset{compat=1.18}}{}
\IfFileExists{tkz-euclide.sty}{\usepackage{tkz-euclide}}{}
\IfFileExists{tkz-tab.sty}{\usepackage{tkz-tab}}{}
\IfFileExists{ex_test.sty}{\usepackage{ex_test}}{}
\ifdefined\usetikzlibrary
  \usetikzlibrary{arrows.meta,angles,quotes,calc,intersections,patterns,positioning,decorations.pathmorphing,decorations.markings,shapes.geometric,backgrounds,3d}
\fi
\makeatletter
\@ifundefined{ex}{\newenvironment{ex}{\par\medskip\noindent}{\par\medskip}}{}
\@ifundefined{True}{\newcommand{\True}{}}{}
\@ifundefined{choice}{\newcommand{\choice}[4]{\par A. #1\quad B. #2\quad C. #3\quad D. #4\par}}{}
\@ifundefined{choiceTF}{\newcommand{\choiceTF}[4]{\par a) #1\quad b) #2\quad c) #3\quad d) #4\par}}{}
\@ifundefined{loigiai}{\newcommand{\loigiai}[1]{\par\smallskip\textbf{Solution. }#1}}{}
\@ifundefined{shortans}{\newcommand{\shortans}[2][]{\par\textbf{Answer: }#2}}{}
\@ifundefined{dapso}{\newcommand{\dapso}[1]{\par\textbf{Answer: }#1}}{}
\@ifundefined{heva}{\newcommand{\heva}[1]{\left\{\begin{aligned}#1\end{aligned}\right.}}{}
\@ifundefined{hoac}{\newcommand{\hoac}[1]{\left[\begin{aligned}#1\end{aligned}\right.}}{}
\@ifundefined{immini}{\newcommand{\immini}[2]{\begin{minipage}[t]{.58\linewidth}#1\end{minipage}\hfill\begin{minipage}[t]{.38\linewidth}#2\end{minipage}}}{}
\@ifundefined{imminiL}{\newcommand{\imminiL}[2]{\begin{minipage}[t]{.38\linewidth}#1\end{minipage}\hfill\begin{minipage}[t]{.58\linewidth}#2\end{minipage}}}{}
\@ifundefined{dien}{\newcommand{\dien}[1]{\underline{\hspace{#1}}}}{}
\makeatother
`;

const KNOWN_COMMANDS = new Set(
  `begin end item frac dfrac tfrac sqrt left right middle text textrm textbf textit texttt
   mathrm mathbf mathit mathcal mathbb mathsf operatorname overline underline vec widehat widetilde
   limits displaystyle scriptstyle scriptscriptstyle label ref eqref cite footnote href url includegraphics
   input include centering hfill vfill hspace vspace smallskip medskip bigskip noindent par newline linebreak
   rule raisebox rotatebox resizebox scalebox color textcolor colorbox fcolorbox multicolumn cline hline
   topmidrule midrule bottomrule caption section subsection subsubsection paragraph emph verb phantom
   quad qquad enspace thinspace neg medspace thickspace ensuremath protect relax today pageref
   alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi omicron
   pi varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega Gamma Delta Theta Lambda Xi
   Pi Sigma Upsilon Phi Psi Omega infty partial nabla forall exists neg land lor implies iff setminus
   subset subseteq supset supseteq in notin ni cup cap emptyset varnothing mathfrak
   le leq ge geq ne neq approx sim simeq equiv pm mp times div cdot ast star circ bullet
   sum prod coprod int iint iiint oint lim min max sup inf log ln exp sin cos tan cot sec csc arcsin
   arccos arctan det gcd mod pmod bmod binom choose
   ex True choice choiceTF loigiai shortans dapso heva hoac immini imminiL dien
   draw path node coordinate fill filldraw shade shadedraw clip graph foreach tikzset pgfplotsset
   addplot addlegendentry tkzDefPoint tkzDrawPoints tkzDrawSegments tkzLabelPoints tkzMarkAngle
   tkzTabInit tkzTabLine tkzTabVar tkzTabVal`.split(/\s+/),
);

const KNOWN_ENVIRONMENTS = new Set(
  `ex tikzpicture axis scope enumerate itemize description center flushleft flushright minipage
   equation equation* align align* aligned gather gather* multline multline* split cases matrix pmatrix
   bmatrix Bmatrix vmatrix Vmatrix array tabular tabularx multicols picture`.split(/\s+/),
);

const COMMAND_PACKAGES: Record<string, string> = {
  includegraphics: 'graphicx',
  tikzset: 'tikz',
  draw: 'tikz',
  addplot: 'pgfplots',
  addlegendentry: 'pgfplots',
  tkzDefPoint: 'tkz-euclide',
  tkzDrawPoints: 'tkz-euclide',
  tkzDrawSegments: 'tkz-euclide',
  tkzLabelPoints: 'tkz-euclide',
  tkzMarkAngle: 'tkz-euclide',
  tkzTabInit: 'tkz-tab',
  tkzTabLine: 'tkz-tab',
  tkzTabVar: 'tkz-tab',
};

function declaredTokens(preamble: string) {
  const commands = new Set<string>();
  const environments = new Set<string>();
  const clean = maskComments(preamble);
  for (const match of clean.matchAll(
    /\\(?:newcommand|renewcommand|providecommand|DeclareMathOperator)\*?\s*\{?\\([A-Za-z@]+)\}?/g,
  ))
    commands.add(match[1]);
  for (const match of clean.matchAll(/\\(?:newenvironment|renewenvironment)\s*\{([^}]+)\}/g))
    environments.add(match[1]);
  return { commands, environments };
}

/** Fast import-time warning. TeX Live remains the authoritative validator at compile time. */
export function findUnsupportedLatex(source: string, additionalPreamble = ''): TexSupportIssue[] {
  const clean = maskComments(source);
  const declared = declaredTokens(`${INTEGRATED_TEX_PREAMBLE}\n${additionalPreamble}`);
  const output = new Map<string, TexSupportIssue>();
  for (const match of clean.matchAll(/\\([A-Za-z@]+)\*?/g)) {
    const command = match[1];
    if (KNOWN_COMMANDS.has(command) || declared.commands.has(command)) continue;
    const looksCustom = /[A-Z@]/.test(command) || command.length > 14;
    if (!looksCustom) continue;
    const packageName = COMMAND_PACKAGES[command];
    output.set(`command:${command}`, {
      kind: 'command',
      token: `\\${command}`,
      message: packageName
        ? `Lệnh \\${command} cần gói ${packageName}.`
        : `Chưa có khai báo chắc chắn cho lệnh \\${command}.`,
      suggestion: packageName
        ? `\\usepackage{${packageName}}`
        : `% Bổ sung đúng số tham số cho \\${command}, ví dụ:\n% \\newcommand{\\${command}}[1]{#1}`,
    });
  }
  for (const match of clean.matchAll(/\\begin\s*\{([^}]+)\}/g)) {
    const environment = match[1];
    if (KNOWN_ENVIRONMENTS.has(environment) || declared.environments.has(environment)) continue;
    output.set(`environment:${environment}`, {
      kind: 'environment',
      token: environment,
      message: `Chưa có khai báo chắc chắn cho môi trường ${environment}.`,
      suggestion: `% \\newenvironment{${environment}}{...}{...}`,
    });
  }
  return [...output.values()];
}

export function diagnoseTexLog(log: string): TexSupportIssue[] {
  const output = new Map<string, TexSupportIssue>();
  for (const match of log.matchAll(/LaTeX Error: File [`']([^`']+\.sty)' not found\./g)) {
    const file = match[1];
    output.set(`package:${file}`, {
      kind: 'package',
      token: file,
      message: `TeX Live đang thiếu gói ${file}. Cần cài gói này bằng TeX Live Manager.`,
      suggestion: `% Cài ${file} bằng TeX Live Manager rồi thử lại.`,
    });
  }
  for (const match of log.matchAll(/Undefined control sequence\.[\s\S]{0,180}?\\([A-Za-z@]+)/g)) {
    const command = match[1];
    output.set(`command:${command}`, {
      kind: 'command',
      token: `\\${command}`,
      message: `TeX Live chưa nhận ra lệnh \\${command}.`,
      suggestion: COMMAND_PACKAGES[command]
        ? `\\usepackage{${COMMAND_PACKAGES[command]}}`
        : `% Dán khai báo gốc của \\${command} vào đây.`,
    });
  }
  for (const match of log.matchAll(/LaTeX Error: Environment ([^ ]+) undefined\./g)) {
    const environment = match[1];
    output.set(`environment:${environment}`, {
      kind: 'environment',
      token: environment,
      message: `TeX Live chưa nhận ra môi trường ${environment}.`,
      suggestion: `% Dán \\newenvironment{${environment}}{...}{...} hoặc gói cung cấp nó.`,
    });
  }
  return [...output.values()];
}

export interface PreparedPreview {
  document: string;
  question: string;
  sourceLineOffset: number;
}

/** Construct disposable preview files; never rewrite the saved question. */
export function prepareTexPreview(
  raw: string,
  setup: string,
  options: { integrated?: boolean; additionalPreamble?: string } = {},
): PreparedPreview {
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
  const externalPreamble = begin ? setup.slice(0, begin.index) : setup;
  if (/\\end\s*\{document\}/.test(maskComments(externalPreamble)))
    throw new Error('Bộ khai báo có lệnh kết thúc tài liệu không hợp lệ.');
  const useIntegrated = options.integrated ?? !externalPreamble.trim();
  if (!useIntegrated && !externalPreamble.trim())
    throw new Error('Bộ khai báo trống. Chọn main.tex hoặc dùng bộ tích hợp của ứng dụng.');
  if (
    options.additionalPreamble &&
    /\\(?:documentclass\b|begin\s*\{document\}|end\s*\{document\})/.test(
      maskComments(options.additionalPreamble),
    )
  )
    throw new Error('Khai báo bổ sung không được chứa documentclass hoặc môi trường document.');
  const combined = [
    externalPreamble,
    useIntegrated ? INTEGRATED_TEX_PREAMBLE : '',
    options.additionalPreamble,
  ]
    .filter((part) => part?.trim())
    .join('\n');
  const documentClass = /\\documentclass\b/.test(maskComments(combined))
    ? ''
    : '\\documentclass[12pt,a4paper]{article}\n';
  const question = wrapped ? raw : `\\begin{ex}\n${raw}\n\\end{ex}`;
  return {
    question,
    sourceLineOffset: wrapped ? 0 : 1,
    document: `${documentClass}${combined}\n
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
