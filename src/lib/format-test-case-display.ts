function tryParseJsonArray(value: string): unknown[] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    if (!trimmed.includes("\n")) {
      try {
        const parsed = JSON.parse(trimmed.replace(/\s+/g, ""));
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseArrayElements(val: string): string[] {
  const str = String(val ?? "").trim();
  if (!str) return [];

  if (str.includes("\n")) {
    const [countLine, ...rest] = str.split("\n");
    const valuesLine = rest.join("\n").trim();
    if (/^\d+$/.test(countLine.trim()) && valuesLine) {
      return valuesLine.split(/\s+/).filter(Boolean);
    }
  }

  const jsonArray = tryParseJsonArray(str);
  if (jsonArray) {
    return jsonArray.map((item) => String(item));
  }

  return str.replace(/,/g, " ").split(/\s+/).filter(Boolean);
}

function formatLiteral(value: string, type: string): string {
  const trimmed = value.trim();
  if (type === "string" || type === "String" || type === "char") {
    return `"${trimmed}"`;
  }
  if (type === "bool" || type === "boolean") {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

function formatArrayLiteral(elements: string[], elementType: string): string {
  return `[${elements.map((el) => formatLiteral(el, elementType)).join(",")}]`;
}

function formatMatrixLiteral(val: string, elementType: string): string {
  const parts = val.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return val;

  const rows = Number.parseInt(parts[0], 10);
  const cols = Number.parseInt(parts[1], 10);
  const values = parts.slice(2);

  if (
    !Number.isFinite(rows) ||
    !Number.isFinite(cols) ||
    values.length !== rows * cols
  ) {
    return val;
  }

  const rowStrings: string[] = [];
  for (let row = 0; row < rows; row += 1) {
    const slice = values.slice(row * cols, (row + 1) * cols);
    rowStrings.push(formatArrayLiteral(slice, elementType));
  }

  return `[${rowStrings.join(",")}]`;
}

function normalizeInputParts(
  rawInput: string | string[],
  parameterTypes: string[] = [],
): string[] {
  if (Array.isArray(rawInput)) {
    const singleArrayParam =
      parameterTypes.length === 1 &&
      parameterTypes[0]?.endsWith("[]") &&
      parameterTypes[0] !== "int[][]";

    if (singleArrayParam && rawInput.length === 2) {
      const countPart = String(rawInput[0] ?? "")
        .replace(/^\[/, "")
        .trim();
      const valuePart = String(rawInput[1] ?? "")
        .replace(/\]$/, "")
        .trim();
      if (/^\d+$/.test(countPart) && valuePart) {
        return [`${countPart}\n${valuePart}`];
      }
    }

    return rawInput.map((part) => String(part ?? ""));
  }

  const text = String(rawInput ?? "");
  const singleArrayParam =
    parameterTypes.length === 1 &&
    parameterTypes[0]?.endsWith("[]") &&
    parameterTypes[0] !== "int[][]";

  if (singleArrayParam) {
    return [text];
  }

  return text.split("\n").filter((line) => line.trim() !== "");
}

function formatParameterDisplay(
  name: string,
  type: string,
  value: string,
): string {
  const paramName = name || "param";

  if (type === "int[][]" || type === "string[][]") {
    const elementType = type === "string[][]" ? "string" : "int";
    return `${paramName} = ${formatMatrixLiteral(value, elementType)}`;
  }

  if (type.endsWith("[]")) {
    const elementType = type.slice(0, -2);
    const elements = parseArrayElements(value);
    return `${paramName} = ${formatArrayLiteral(elements, elementType)}`;
  }

  return `${paramName} = ${formatLiteral(value, type)}`;
}

export function formatTestCaseInputDisplay(
  rawInput: string | string[],
  parameterNames: string[] = [],
  parameterTypes: string[] = [],
): string {
  const parts = normalizeInputParts(rawInput, parameterTypes);

  if (parameterTypes.length === 0 && parameterNames.length === 0) {
    if (parts.length === 1) {
      const elements = parseArrayElements(parts[0]);
      if (elements.length > 1 || parts[0].includes("\n")) {
        return formatArrayLiteral(elements, "int");
      }
    }
    return parts.join("\n");
  }

  return parts
    .map((value, index) =>
      formatParameterDisplay(
        parameterNames[index] || `param${index}`,
        parameterTypes[index] || "",
        value,
      ),
    )
    .join("\n");
}

export function formatTestCaseOutputDisplay(
  output: string,
  returnType = "int",
): string {
  const text = String(output ?? "").trim();
  if (!text) return "";

  if (returnType === "int[][]" || returnType === "string[][]") {
    const elementType = returnType === "string[][]" ? "string" : "int";
    return formatMatrixLiteral(text, elementType);
  }

  if (returnType.endsWith("[]")) {
    const elementType = returnType.slice(0, -2);
    return formatArrayLiteral(parseArrayElements(text), elementType);
  }

  if (returnType === "string" || returnType === "String" || returnType === "char") {
    return `"${text}"`;
  }

  if (returnType === "bool" || returnType === "boolean") {
    return text.toLowerCase();
  }

  if (text.includes(" ") && /^-?\d+(\s+-?\d+)*$/.test(text)) {
    return formatArrayLiteral(text.split(/\s+/), "int");
  }

  return text;
}
