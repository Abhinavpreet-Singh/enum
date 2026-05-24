export const generatePythonWrapper = ({
  userFunctionCode,
  functionName,
  parameterTypes,
  returnType
}) => {
  const userImportLines = [];
  const userCodeLines = userFunctionCode.split('\n');
  const filteredCodeLines = [];
  for (const line of userCodeLines) {
    if (/^\s*(import\s+|from\s+\S+\s+import\s+)/.test(line)) {
      userImportLines.push(line);
    } else {
      filteredCodeLines.push(line);
    }
  }
  userFunctionCode = filteredCodeLines.join('\n');
  const extraImports = userImportLines.length > 0 ? userImportLines.join('\n') + '\n' : '';

  let inputParsing = "";
  let functionParams = "";

  parameterTypes.forEach((type, index) => {
    if (type === "int") {
      inputParsing += `param${index} = int(_next_line())\n`;
    } else if (type === "float" || type === "double") {
      inputParsing += `param${index} = float(_next_line())\n`;
    } else if (type === "string" || type === "String") {
      inputParsing += `param${index} = _next_line()\n`;
    } else if (type === "bool") {
      inputParsing += `param${index} = _next_line().strip().lower() == "true"\n`;
    } else if (type === "int[]") {
      inputParsing += `_n${index} = int(_next_line())\n`;
      inputParsing += `_vl${index} = _next_line()\n`;
      inputParsing += `param${index} = list(map(int, _vl${index}.split())) if _vl${index}.strip() else []\n`;
    } else if (type === "string[]") {
      inputParsing += `_n${index} = int(_next_line())\n`;
      inputParsing += `_vl${index} = _next_line()\n`;
      inputParsing += `param${index} = _vl${index}.split() if _vl${index}.strip() else []\n`;
    } else if (type === "float[]") {
      inputParsing += `_n${index} = int(_next_line())\n`;
      inputParsing += `_vl${index} = _next_line()\n`;
      inputParsing += `param${index} = list(map(float, _vl${index}.split())) if _vl${index}.strip() else []\n`;
    }

    functionParams += `param${index}`;
    if (index !== parameterTypes.length - 1) {
      functionParams += ", ";
    }
  });

  let outputCode = "";
  if (returnType === "int[]" || returnType === "float[]" || returnType === "string[]") {
    outputCode = `print(" ".join(map(str, result)))`;
  } else if (returnType === "bool") {
    outputCode = `print("true" if result else "false")`;
  } else if (returnType === "void") {
    outputCode = ``;
  } else {
    outputCode = `print(result)`;
  }

  const callCode = returnType === "void"
    ? `${functionName}(${functionParams})`
    : `result = ${functionName}(${functionParams})`;

  return `import sys
${extraImports}_lines = sys.stdin.read().replace('\\r', '').split('\\n')
_line_idx = 0
def _next_line():
    global _line_idx
    if _line_idx < len(_lines):
        line = _lines[_line_idx]
        _line_idx += 1
        return line
    return ""

${userFunctionCode}

${inputParsing}
${callCode}
${outputCode}
`;
};
