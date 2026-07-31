import { Fragment, type ReactNode } from "react";

function isBulletLine(line: string): boolean {
  return line.trim().startsWith("- ");
}

function isNumberedLine(line: string): boolean {
  return /^\d+\.\s/.test(line.trim());
}

function stripBullet(line: string): string {
  return line.trim().replace(/^-\s+/, "");
}

function stripNumber(line: string): string {
  return line.trim().replace(/^\d+\.\s+/, "");
}

function formatInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={i}
          className="font-semibold text-black dark:text-white"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-800 dark:bg-white/10 dark:text-gray-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

interface ProblemDescriptionProps {
  text: string;
  className?: string;
}

export default function ProblemDescription({
  text,
  className = "",
}: ProblemDescriptionProps) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let numberedBuffer: string[] = [];
  let key = 0;

  const flushBulletList = () => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="space-y-2">
        {bulletBuffer.map((line, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-0.5 shrink-0 text-gray-400">•</span>
            <span>{formatInline(stripBullet(line))}</span>
          </li>
        ))}
      </ul>,
    );
    bulletBuffer = [];
  };

  const flushNumberedList = () => {
    if (numberedBuffer.length === 0) return;
    elements.push(
      <ol key={key++} className="list-decimal space-y-2 pl-5">
        {numberedBuffer.map((line, i) => (
          <li key={i} className="leading-relaxed">
            {formatInline(stripNumber(line))}
          </li>
        ))}
      </ol>,
    );
    numberedBuffer = [];
  };

  const flushLists = () => {
    flushBulletList();
    flushNumberedList();
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushLists();
      continue;
    }
    if (isBulletLine(trimmed)) {
      flushNumberedList();
      bulletBuffer.push(trimmed);
    } else if (isNumberedLine(trimmed)) {
      flushBulletList();
      numberedBuffer.push(trimmed);
    } else {
      flushLists();
      elements.push(
        <p key={key++} className="leading-relaxed">
          {formatInline(trimmed)}
        </p>,
      );
    }
  }
  flushLists();

  return (
    <div
      className={`space-y-3 text-sm text-gray-700 dark:text-gray-300 ${className}`}
    >
      {elements}
    </div>
  );
}
