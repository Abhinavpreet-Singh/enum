/**
 * CSS Similarity Scorer
 *
 * Compares user-written CSS/HTML against a model solution and returns a
 * structured score breakdown.  All parsing runs in the browser — no network
 * calls required.
 *
 * Algorithm:
 *  - CSS  → extract selector→property→value triples; score = matched / total
 *  - HTML → Jaccard similarity on tag/class tokens
 *  - Other → Jaccard similarity on identifier tokens
 */

/* ─── Types ──────────────────────────────────────────────────── */

export interface PropertyCheck {
  /** CSS selector string, e.g. ".gallery" */
  selector: string;
  /** CSS property name, e.g. "display" */
  property: string;
  /** Value expected in the solution, e.g. "grid" */
  solutionValue: string;
  /** Value the user has written, or null if the property is missing */
  userValue: string | null;
  matched: boolean;
}

export interface FileScore {
  filename: string;
  /** 0–100 */
  score: number;
  checks: PropertyCheck[];
  matchedCount: number;
  totalCount: number;
  /** true when the file was scored as CSS (enables property drill-down UI) */
  isCss: boolean;
}

export type ScoreLabel =
  | "Excellent!"
  | "Good Work!"
  | "Keep Going"
  | "Needs Work";

export interface ScoreResult {
  /** Weighted average across all scored files (0–100) */
  overall: number;
  files: FileScore[];
  /** true when overall >= 75 */
  passed: boolean;
  label: ScoreLabel;
}

/* ─── Internal helpers ──────────────────────────────────────── */

type CssRuleMap = Map<string, Map<string, string>>;

function normalizeValue(v: string): string {
  return v.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Parse `property: value;` pairs from a CSS rule body */
function parseDeclarations(body: string): Map<string, string> {
  const props = new Map<string, string>();
  // Match prop: value (stops at ; or end of string)
  const re = /([a-z-]+)\s*:\s*([^;]+?)(?:;|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const prop = m[1].trim().toLowerCase();
    const val = normalizeValue(m[2]);
    if (prop && val) props.set(prop, val);
  }
  return props;
}

/**
 * Parse CSS into a map of selector → (property → value).
 * Handles @media / @supports by recursing into them and merging rules at the
 * selector level (so .foo inside @media and .foo outside are merged together —
 * what matters is that the property exists *somewhere*).
 */
function parseCssRules(css: string): CssRuleMap {
  const result: CssRuleMap = new Map();

  // Strip comments, normalise whitespace
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, " ").toLowerCase();

  let i = 0;
  while (i < clean.length) {
    // Skip whitespace
    while (i < clean.length && /\s/.test(clean[i])) i++;
    if (i >= clean.length) break;

    // Find next opening brace
    const openIdx = clean.indexOf("{", i);
    if (openIdx === -1) break;

    const prefix = clean.slice(i, openIdx).trim();

    if (prefix.startsWith("@")) {
      // At-rule (@media, @supports …) — find matching close brace
      let depth = 1;
      let j = openIdx + 1;
      while (j < clean.length && depth > 0) {
        if (clean[j] === "{") depth++;
        else if (clean[j] === "}") depth--;
        j++;
      }
      // Recurse into the at-rule's body
      const inner = clean.slice(openIdx + 1, j - 1);
      const innerRules = parseCssRules(inner);
      innerRules.forEach((props, sel) => {
        if (!result.has(sel)) result.set(sel, new Map());
        props.forEach((v, k) => result.get(sel)!.set(k, v));
      });
      i = j;
    } else {
      // Regular selector { declarations }
      const closeIdx = clean.indexOf("}", openIdx + 1);
      if (closeIdx === -1) break;

      const body = clean.slice(openIdx + 1, closeIdx);
      const selectors = prefix
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const props = parseDeclarations(body);

      for (const sel of selectors) {
        if (!result.has(sel)) result.set(sel, new Map());
        props.forEach((v, k) => result.get(sel)!.set(k, v));
      }
      i = closeIdx + 1;
    }
  }

  return result;
}

/** Two values match when one contains the other (handles shorthand variants) */
function valuesMatch(user: string, solution: string): boolean {
  const u = normalizeValue(user);
  const s = normalizeValue(solution);
  if (u === s) return true;
  if (u.includes(s) || s.includes(u)) return true;
  return false;
}

/* ─── File-level scorers ─────────────────────────────────────── */

function scoreCssFile(
  userCss: string,
  solutionCss: string,
  filename: string,
): FileScore {
  const solutionMap = parseCssRules(solutionCss);
  const userMap = parseCssRules(userCss);

  const checks: PropertyCheck[] = [];
  let matchedCount = 0;
  let totalCount = 0;

  solutionMap.forEach((solutionProps, selector) => {
    solutionProps.forEach((solutionValue, property) => {
      totalCount++;
      const userProps = userMap.get(selector);
      const userValue = userProps?.get(property) ?? null;
      const matched =
        userValue !== null && valuesMatch(userValue, solutionValue);
      if (matched) matchedCount++;
      checks.push({ selector, property, solutionValue, userValue, matched });
    });
  });

  const score =
    totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 100;

  return { filename, score, checks, matchedCount, totalCount, isCss: true };
}

function scoreGenericFile(
  userCode: string,
  solutionCode: string,
  filename: string,
  isCss = false,
): FileScore {
  const tokenize = (code: string): Set<string> =>
    new Set(code.toLowerCase().match(/[a-z0-9_:-]+/g) ?? []);

  const solutionTokens = tokenize(solutionCode);
  const userTokens = tokenize(userCode);
  const intersection = new Set(
    [...solutionTokens].filter((t) => userTokens.has(t)),
  );
  const union = new Set([...solutionTokens, ...userTokens]);

  const score =
    union.size > 0 ? Math.round((intersection.size / union.size) * 100) : 100;

  return {
    filename,
    score,
    checks: [],
    matchedCount: intersection.size,
    totalCount: solutionTokens.size,
    isCss,
  };
}

/* ─── File weight table ──────────────────────────────────────── */

const FILE_WEIGHTS: Record<string, number> = {
  css: 0.7,
  html: 0.3,
  htm: 0.3,
  js: 0.55,
  ts: 0.55,
  tsx: 0.55,
  jsx: 0.55,
};

function getWeight(filename: string): number {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return FILE_WEIGHTS[ext] ?? 0.5;
}

function getLabel(score: number): ScoreLabel {
  if (score >= 85) return "Excellent!";
  if (score >= 70) return "Good Work!";
  if (score >= 50) return "Keep Going";
  return "Needs Work";
}

/* ─── Public API ─────────────────────────────────────────────── */

/**
 * Compare the user's files against the solution files and return a full
 * score breakdown.
 *
 * Only files present in `solutionFiles` are scored (files the user wasn't
 * expected to change score 100% by default).
 */
export function evaluateSubmission(
  userFiles: Record<string, string>,
  solutionFiles: Record<string, string>,
): ScoreResult {
  const files: FileScore[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  Object.entries(solutionFiles).forEach(([filename, solutionContent]) => {
    const userContent = userFiles[filename] ?? "";
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";

    let fileScore: FileScore;
    if (ext === "css") {
      fileScore = scoreCssFile(userContent, solutionContent, filename);
    } else {
      fileScore = scoreGenericFile(
        userContent,
        solutionContent,
        filename,
        false,
      );
    }

    files.push(fileScore);
    const weight = getWeight(filename);
    totalWeight += weight;
    weightedScore += fileScore.score * weight;
  });

  const overall = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

  return {
    overall,
    files,
    passed: overall >= 75,
    label: getLabel(overall),
  };
}
