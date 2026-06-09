/**
 * Build token-based input parsing + function-call + output code for C.
 */
function buildCHarness(functionName, parameterTypes, returnType, userFunctionCode) {
  const includeLines = [];
  const bodyLines = [];
  for (const line of userFunctionCode.split("\n")) {
    if (/^\s*#include\s+/.test(line)) includeLines.push(line.trim());
    else bodyLines.push(line);
  }
  const extraIncludes = includeLines.length ? includeLines.join("\n") + "\n" : "";
  const cleanCode = bodyLines.join("\n");

  // Token reader preamble — reads entire stdin, splits on whitespace
  const readerPreamble = `
  /* ── token reader ── */
  static char _stdin_buf[1 << 20];
  int _stdin_len = 0;
  { int c; while((c = getchar()) != EOF && _stdin_len < (int)sizeof(_stdin_buf)-1) _stdin_buf[_stdin_len++] = (char)c; _stdin_buf[_stdin_len] = '\\0'; }
  static char* _toks[65536];
  static int _ntok = 0, _ti = 0;
  { char* _p = strtok(_stdin_buf, " \\t\\r\\n"); while(_p){ _toks[_ntok++] = _p; _p = strtok(NULL, " \\t\\r\\n"); } }
  #define _NEXT_TOK() (_ti < _ntok ? _toks[_ti++] : "0")`;

  let inputParsing = "";
  let functionParams = "";

  parameterTypes.forEach((type, idx) => {
    if (type === "int") {
      inputParsing += `  int param${idx} = atoi(_NEXT_TOK());\n`;
    } else if (type === "double" || type === "float") {
      inputParsing += `  double param${idx} = atof(_NEXT_TOK());\n`;
    } else if (type === "string") {
      inputParsing += `  char* param${idx} = _NEXT_TOK();\n`;
    } else if (type === "bool") {
      inputParsing += `  int param${idx} = (strcmp(_NEXT_TOK(), "true") == 0);\n`;
    } else if (type === "int[]") {
      inputParsing += `  int _n${idx} = atoi(_NEXT_TOK());\n`;
      inputParsing += `  int* param${idx} = (int*)calloc(_n${idx} > 0 ? _n${idx} : 1, sizeof(int));\n`;
      inputParsing += `  for(int _i=0;_i<_n${idx};_i++) param${idx}[_i] = atoi(_NEXT_TOK());\n`;
    } else if (type === "double[]" || type === "float[]") {
      inputParsing += `  int _n${idx} = atoi(_NEXT_TOK());\n`;
      inputParsing += `  double* param${idx} = (double*)calloc(_n${idx} > 0 ? _n${idx} : 1, sizeof(double));\n`;
      inputParsing += `  for(int _i=0;_i<_n${idx};_i++) param${idx}[_i] = atof(_NEXT_TOK());\n`;
    } else {
      inputParsing += `  char* param${idx} = _NEXT_TOK();\n`;
    }

    // C passes arrays with their size
    if (type === "int[]" || type === "double[]" || type === "float[]") {
      functionParams += `param${idx}, _n${idx}`;
    } else {
      functionParams += `param${idx}`;
    }
    if (idx < parameterTypes.length - 1) functionParams += ", ";
  });

  let retSizeDecl = "";
  if (returnType === "int[]" || returnType === "double[]" || returnType === "float[]") {
    if (functionParams) functionParams += ", ";
    functionParams += "&_retSize";
    retSizeDecl = `  int _retSize = 0;\n`;
  }

  const cReturnTypeMap = {
    int: "int", double: "double", float: "double",
    string: "char*", bool: "int",
    "int[]": "int*", "double[]": "double*", "float[]": "double*",
    void: "void",
  };
  const cReturn = cReturnTypeMap[returnType] || "int";

  let outputCode = "";
  if (returnType === "int") {
    outputCode = `  printf("%d", result);`;
  } else if (returnType === "double" || returnType === "float") {
    outputCode = `  printf("%g", result);`;
  } else if (returnType === "string") {
    outputCode = `  printf("%s", result);`;
  } else if (returnType === "bool") {
    outputCode = `  printf("%s", result ? "true" : "false");`;
  } else if (returnType === "int[]") {
    outputCode = `  for(int _i=0;_i<_retSize;_i++){ if(_i>0) printf(" "); printf("%d", result[_i]); }`;
  } else if (returnType === "double[]" || returnType === "float[]") {
    outputCode = `  for(int _i=0;_i<_retSize;_i++){ if(_i>0) printf(" "); printf("%g", result[_i]); }`;
  } else if (returnType === "void") {
    outputCode = "";
  } else {
    outputCode = `  printf("%d", result);`;
  }

  const resultDecl = returnType === "void"
    ? `  ${functionName}(${functionParams});`
    : `  ${cReturn} result = ${functionName}(${functionParams});`;

  return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
${extraIncludes}
${cleanCode}

int main() {
  ${readerPreamble}

${inputParsing}
${retSizeDecl}${resultDecl}
${outputCode}

  return 0;
}
`;
}

// ─── Public export ────────────────────────────────────────────────────────────

export const generateCWrapper = ({
  userFunctionCode,
  functionName,
  parameterTypes,
  returnType,
}) => {
  // 1) Explicit metadata provided
  if (functionName && Array.isArray(parameterTypes) && parameterTypes.length > 0) {
    return buildCHarness(functionName, parameterTypes, returnType, userFunctionCode);
  }

  // 2) Script mode — add headers if missing and run as-is
  const hasIncludes = /#include/.test(userFunctionCode);
  const prefix = hasIncludes ? "" : "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n";
  return prefix + userFunctionCode;
};
