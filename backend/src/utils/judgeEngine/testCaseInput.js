/**
 * Normalise coding-question test input into the line array the judge engines expect.
 * Each entry is one function parameter (array params use "count\\nval val val").
 */

function tryParseJsonArray(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // Only compact single-line bracketed lists — never strip newlines inside count\nvalues payloads
    if (!trimmed.includes("\n")) {
      const compact = trimmed.replace(/\s+/g, "");
      try {
        const parsed = JSON.parse(compact);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function unwrapBrokenArrayLines(input) {
  if (!Array.isArray(input) || input.length !== 2) return null;
  const countPart = String(input[0] ?? "").replace(/^\[/, "").trim();
  const valuePart = String(input[1] ?? "").replace(/\]$/, "").trim();
  if (/^\d+$/.test(countPart) && valuePart) {
    return `${countPart}\n${valuePart}`;
  }
  return null;
}

function unwrapSplitJsonLines(input) {
  if (!Array.isArray(input) || input.length <= 1) return null;
  const first = String(input[0] ?? "").trim();
  const last = String(input[input.length - 1] ?? "").trim();
  if (!first.startsWith("[") && !last.endsWith("]")) return null;

  const joined = input.map((s) => String(s).trim()).join(",");
  const parsed = tryParseJsonArray(joined);
  if (parsed) return parsed;

  const compact = joined.replace(/\s+/g, "");
  return tryParseJsonArray(compact);
}

function formatArrayParameter(val) {
  if (Array.isArray(val)) {
    const elements = val.map((x) => String(x).trim()).filter(Boolean);
    return `${elements.length}\n${elements.join(" ")}`;
  }

  const str = String(val ?? "").trim();
  if (!str) return "0\n";

  // Already "count\nvalues"
  if (str.includes("\n")) {
    const [countLine, ...rest] = str.split("\n");
    const values = rest.join("\n").trim();
    if (/^\d+$/.test(countLine.trim()) && values) {
      return `${countLine.trim()}\n${values}`;
    }
  }

  const jsonArray = tryParseJsonArray(str);
  if (jsonArray) {
    const elements = jsonArray.map((x) => String(x).trim()).filter((x) => x !== "");
    return `${elements.length}\n${elements.join(" ")}`;
  }

  const normalized = str.replace(/,/g, " ").trim();
  const elements = normalized.split(/\s+/).filter(Boolean);
  return `${elements.length}\n${elements.join(" ")}`;
}

function formatScalarParameter(val) {
  return String(val ?? "").trim().replace(/,/g, " ");
}

function formatMatrixParameter(val) {
  if (Array.isArray(val) && val.length > 0 && Array.isArray(val[0])) {
    const rows = val.length;
    const cols = val[0].length;
    const flat = val.flat().map((x) => String(x).trim());
    return `${rows} ${cols} ${flat.join(" ")}`;
  }

  const str = String(val ?? "").trim();
  return str;
}

function formatParameterInput(val, type) {
  if (type === "int[][]") {
    return formatMatrixParameter(val);
  }
  if (type && type.endsWith("[]")) {
    return formatArrayParameter(val);
  }
  return formatScalarParameter(val);
}

/**
 * @param {unknown} rawInput - string, string[], or JSON-stringified array from bank import
 * @param {string[]} [parameterTypes]
 * @returns {string[]}
 */
export function normaliseJudgeTestCaseInput(rawInput, parameterTypes = []) {
  let input = rawInput;
  const singleArrayParam =
    parameterTypes.length === 1 &&
    parameterTypes[0]?.endsWith("[]") &&
    parameterTypes[0] !== "int[][]";

  if (typeof input === "string") {
    const parsed = tryParseJsonArray(input.trim());
    input = parsed ?? input;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (singleArrayParam) {
      // Keep "count\\nvalues" on one parameter — never split on newline
      input = [trimmed.replace(/^\[/, "").replace(/\]$/, "")];
    } else if (parameterTypes.length > 1) {
      input = trimmed.split("\n").filter((s) => s.trim() !== "");
    } else {
      input = trimmed ? [trimmed] : [""];
    }
  } else if (Array.isArray(input)) {
    const brokenArray = singleArrayParam ? unwrapBrokenArrayLines(input) : null;
    if (brokenArray) {
      input = [brokenArray];
    } else {
      const splitJson = unwrapSplitJsonLines(input);
      if (splitJson) {
        input = splitJson;
      }
    }

    // Numeric array from legacy imports: treat as single int[] argument values
    if (
      Array.isArray(input) &&
      input.length > 0 &&
      input.every(
        (v) =>
          typeof v === "number" ||
          (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(String(v).trim())),
      )
    ) {
      const type = parameterTypes[0] || "int[]";
      if (type.endsWith("[]") && parameterTypes.length <= 1) {
        return [formatArrayParameter(input)];
      }
    }
  }

  if (!Array.isArray(input)) {
    input = [String(input ?? "")];
  }

  if (parameterTypes.length > 0) {
    return input.map((val, i) => formatParameterInput(val, parameterTypes[i] || ""));
  }

  // No signature metadata — best-effort for a single JSON / array payload
  if (input.length === 1) {
    const only = String(input[0] ?? "").trim();
    if (only.startsWith("[") || only.includes(",")) {
      return [formatArrayParameter(only)];
    }
  }

  return input.map((val) => String(val ?? "").trim()).filter((s) => s !== "");
}

/**
 * Format test-case input for storage on BankQuestion (per-parameter line array).
 */
export function formatBankTestCaseInput(rawInput, parameterTypes = []) {
  return normaliseJudgeTestCaseInput(rawInput, parameterTypes);
}
