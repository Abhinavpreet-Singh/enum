// ─── Type mapping: Python type hints → internal judge type names ─────────────
const PY_TO_INTERNAL = {
  int: "int", float: "double", str: "String", bool: "bool",
  "List[int]": "int[]", "list[int]": "int[]",
  "List[float]": "double[]", "list[float]": "double[]",
  "List[str]": "String[]", "list[str]": "String[]",
};

/**
 * Try to extract the first non-dunder function signature from Python source.
 * Returns { functionName, parameterTypes, returnType } or null.
 */
function parsePythonSignature(code) {
  // Match: def funcName(params) -> returnType:   OR   def funcName(params):
  const defRe = /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([\w\[\], |None]+?)\s*)?:/g;

  let match;
  while ((match = defRe.exec(code)) !== null) {
    const funcName = match[1];
    const paramsStr = match[2].trim();
    const retHint = (match[3] || "").trim();

    if (funcName.startsWith("__") || funcName === "main") continue;

    const paramTypes = paramsStr
      ? paramsStr
          .split(",")
          .map((p) => {
            const name = p.trim().split(/[:\s]/)[0].trim();
            if (name === "self" || name === "cls" || !name) return null;
            const hint = p.includes(":") ? p.split(":")[1].trim() : "";
            return PY_TO_INTERNAL[hint] || (hint ? hint : "int");
          })
          .filter(Boolean)
      : [];

    const returnType = PY_TO_INTERNAL[retHint] || (retHint && retHint !== "None" ? retHint : "void");

    return { functionName: funcName, parameterTypes: paramTypes, returnType };
  }
  return null;
}

/**
 * Build token-based input parsing + function-call + output code for Python.
 */
function buildPythonHarness(functionName, parameterTypes, returnType, userFunctionCode) {
  const userImportLines = [];
  const bodyLines = [];
  for (const line of userFunctionCode.split("\n")) {
    if (/^\s*(import\s+|from\s+\S+\s+import\s+)/.test(line)) userImportLines.push(line);
    else bodyLines.push(line);
  }
  const extraImports = userImportLines.length ? userImportLines.join("\n") + "\n" : "";
  const cleanCode = bodyLines.join("\n");

  // Token reader
  const readerPreamble = `import sys as _sys
${extraImports}_tokens = _sys.stdin.read().split()
_ti = [0]
def _next_tok():
    v = _tokens[_ti[0]]; _ti[0] += 1; return v
`;

  let inputParsing = "";
  let functionParams = "";

  parameterTypes.forEach((type, idx) => {
    if (type === "int") {
      inputParsing += `param${idx} = int(_next_tok())\n`;
    } else if (type === "double" || type === "float") {
      inputParsing += `param${idx} = float(_next_tok())\n`;
    } else if (type === "String" || type === "string" || type === "str") {
      inputParsing += `param${idx} = _next_tok()\n`;
    } else if (type === "bool") {
      inputParsing += `param${idx} = (_next_tok().strip().lower() == "true")\n`;
    } else if (type === "int[]") {
      inputParsing += `_n${idx} = int(_next_tok())\n`;
      inputParsing += `param${idx} = [int(_next_tok()) for _ in range(_n${idx})]\n`;
    } else if (type === "double[]" || type === "float[]") {
      inputParsing += `_n${idx} = int(_next_tok())\n`;
      inputParsing += `param${idx} = [float(_next_tok()) for _ in range(_n${idx})]\n`;
    } else if (type === "String[]" || type === "string[]") {
      inputParsing += `_n${idx} = int(_next_tok())\n`;
      inputParsing += `param${idx} = [_next_tok() for _ in range(_n${idx})]\n`;
    } else {
      inputParsing += `param${idx} = int(_next_tok())\n`;
    }

    functionParams += `param${idx}`;
    if (idx < parameterTypes.length - 1) functionParams += ", ";
  });

  let outputCode = "";
  if (returnType === "int[]" || returnType === "double[]" || returnType === "float[]" ||
      returnType === "String[]" || returnType === "string[]") {
    outputCode = `print(" ".join(map(str, result)))`;
  } else if (returnType === "bool") {
    outputCode = `print("true" if result else "false")`;
  } else if (returnType === "void") {
    outputCode = "";
  } else {
    outputCode = `print(result)`;
  }

  const callCode = returnType === "void"
    ? `${functionName}(${functionParams})`
    : `result = ${functionName}(${functionParams})`;

  return `${readerPreamble}
${cleanCode}

${inputParsing}
${callCode}
${outputCode}
`;
}

// ─── Public export ────────────────────────────────────────────────────────────

export const generatePythonWrapper = ({
  userFunctionCode,
  functionName,
  parameterTypes,
  returnType,
}) => {
  // 1) Explicit metadata provided
  if (functionName && Array.isArray(parameterTypes) && parameterTypes.length > 0) {
    return buildPythonHarness(functionName, parameterTypes, returnType, userFunctionCode);
  }

  // 2) Complete script with __main__ guard — run as-is (class-based OOP questions)
  if (/if\s+__name__\s*==\s*['"]__main__['"]/.test(userFunctionCode)) {
    return userFunctionCode;
  }

  // 3) Auto-detect function signature from code
  const detected = parsePythonSignature(userFunctionCode);
  if (detected && detected.parameterTypes.length > 0) {
    return buildPythonHarness(
      detected.functionName,
      detected.parameterTypes,
      detected.returnType,
      userFunctionCode,
    );
  }

  // 4) Script mode — run as-is (user reads stdin themselves via input() or sys.stdin)
  return userFunctionCode;
};
