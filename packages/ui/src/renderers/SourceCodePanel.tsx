import type { AlgorithmMetadata, VisualizationEvent } from "@algoviz/core";

export interface SourceCodePanelProps {
  metadata: AlgorithmMetadata | null;
  activeEvent: VisualizationEvent | null;
}

type TokenKind = "comment" | "string" | "number" | "keyword" | "plain";

interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS = [
  "function",
  "yield",
  "return",
  "if",
  "else",
  "for",
  "while",
  "break",
  "continue",
  "const",
  "let",
  "var",
  "new",
  "typeof",
  "instanceof",
  "class",
  "interface",
  "type",
  "import",
  "export",
  "from",
  "extends",
  "implements",
  "void",
  "true",
  "false",
  "null",
  "undefined",
  "this",
  "in",
  "of",
  "do",
  "switch",
  "case",
  "default",
  "try",
  "catch",
  "finally",
  "throw",
  "async",
  "await",
];

// Deliberately small and dependency-free: covers line comments, quoted
// strings, numbers, and a fixed keyword list — enough to make real
// TypeScript legible in the source panel without pulling in a highlighter
// library. Not a full tokenizer (no template literals, regex literals,
// multi-line comments) — this only ever runs against our own hand-written
// plugin source snippets, not arbitrary user code.
const TOKEN_PATTERN = new RegExp(
  `//.*$|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\\b\\d+(?:\\.\\d+)?\\b|\\b(?:${KEYWORDS.join("|")})\\b`,
  "g",
);

function classify(match: string): TokenKind {
  if (match.startsWith("//")) return "comment";
  if (match.startsWith('"') || match.startsWith("'")) return "string";
  if (/^\d/.test(match)) return "number";
  return "keyword";
}

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, index), kind: "plain" });
    }
    tokens.push({ text: match[0], kind: classify(match[0]) });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), kind: "plain" });
  }
  return tokens.length > 0 ? tokens : [{ text: line, kind: "plain" }];
}

const TOKEN_CLASSES: Record<TokenKind, string> = {
  comment: "text-slate-500 italic",
  string: "text-success",
  number: "text-accent-2",
  keyword: "text-accent",
  plain: "text-slate-300",
};

export function SourceCodePanel({ metadata, activeEvent }: SourceCodePanelProps) {
  if (!metadata) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-slate-500">
        Pick an algorithm to see its source.
      </div>
    );
  }

  const lines = metadata.sourceCode.code.split("\n");
  const activeLine = activeEvent?.sourceLine;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-medium text-white">
        {metadata.name}{" "}
        <span className="text-xs font-normal text-slate-500">({metadata.sourceCode.language})</span>
      </h3>
      <pre className="overflow-x-auto font-mono text-xs leading-6 text-slate-300">
        {lines.map((line, idx) => {
          const lineNumber = idx + 1;
          return (
            <div key={lineNumber} className={`rounded px-2 ${lineNumber === activeLine ? "bg-accent/20" : ""}`}>
              <span className="mr-3 inline-block w-5 select-none text-right text-slate-600">{lineNumber}</span>
              {/* Index as key: tokens for a fixed source line never reorder. */}
              {tokenizeLine(line).map((token, i) => (
                <span key={i} className={TOKEN_CLASSES[token.kind]}>
                  {token.text}
                </span>
              ))}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
