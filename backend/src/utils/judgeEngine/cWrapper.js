export const generateCWrapper = ({
  userFunctionCode,
  functionName,
  parameterTypes,
  returnType
}) => {
  const userIncludeLines = [];
  const userCodeLines = userFunctionCode.split('\n');
  const filteredCodeLines = [];
  for (const line of userCodeLines) {
    if (/^\s*#include\s+/.test(line)) {
      userIncludeLines.push(line.trim());
    } else {
      filteredCodeLines.push(line);
    }
  }
  userFunctionCode = filteredCodeLines.join('\n');
  const extraIncludes = userIncludeLines.length > 0 ? userIncludeLines.join('\n') + '\n' : '';

  let inputParsing = "";
  let functionParams = "";

  parameterTypes.forEach((type, index) => {
    if (type === "int") {
      inputParsing += `  int param${index} = atoi(_nextLine());\n`;
    } else if (type === "float" || type === "double") {
      inputParsing += `  double param${index} = atof(_nextLine());\n`;
    } else if (type === "string") {
      inputParsing += `  char* param${index} = strdup(_nextLine());\n`;
    } else if (type === "bool") {
      inputParsing += `  int param${index} = (strcmp(_nextLine(), "true") == 0);\n`;
    } else if (type === "int[]") {
      inputParsing += `  int _n${index} = atoi(_nextLine());\n`;
      inputParsing += `  int* param${index} = (int*)calloc(_n${index} > 0 ? _n${index} : 1, sizeof(int));\n`;
      inputParsing += `  { char* _vl = strdup(_nextLine()); if(_n${index} > 0 && strlen(_vl) > 0){ char* _p = strtok(_vl, " "); int _i = 0;\n`;
      inputParsing += `    while(_p && _i < _n${index}){ param${index}[_i++] = atoi(_p); _p = strtok(NULL, " "); } } free(_vl); }\n`;
    } else if (type === "float[]") {
      inputParsing += `  int _n${index} = atoi(_nextLine());\n`;
      inputParsing += `  double* param${index} = (double*)calloc(_n${index} > 0 ? _n${index} : 1, sizeof(double));\n`;
      inputParsing += `  { char* _vl = strdup(_nextLine()); if(_n${index} > 0 && strlen(_vl) > 0){ char* _p = strtok(_vl, " "); int _i = 0;\n`;
      inputParsing += `    while(_p && _i < _n${index}){ param${index}[_i++] = atof(_p); _p = strtok(NULL, " "); } } free(_vl); }\n`;
    }

    if (type === "int[]" || type === "float[]") {
      functionParams += `param${index}, _n${index}`;
    } else {
      functionParams += `param${index}`;
    }

    if (index !== parameterTypes.length - 1) {
      functionParams += ", ";
    }
  });

  let retSizeDecl = "";
  if (returnType === "int[]" || returnType === "float[]") {
    if (functionParams) functionParams += ", ";
    functionParams += "&_retSize";
    retSizeDecl = `  int _retSize = 0;\n`;
  }

  const cReturnTypeMap = {
    int: "int",
    float: "double",
    double: "double",
    string: "char*",
    bool: "int",
    "int[]": "int*",
    "float[]": "double*",
    void: "void"
  };
  const cReturn = cReturnTypeMap[returnType] || "int";

  let outputCode = "";
  if (returnType === "int") {
    outputCode = `  printf("%d", result);`;
  } else if (returnType === "float" || returnType === "double") {
    outputCode = `  printf("%g", result);`;
  } else if (returnType === "string") {
    outputCode = `  printf("%s", result);`;
  } else if (returnType === "bool") {
    outputCode = `  printf("%s", result ? "true" : "false");`;
  } else if (returnType === "int[]") {
    outputCode = `  for(int i=0;i<_retSize;i++){ if(i>0) printf(" "); printf("%d", result[i]); }`;
  } else if (returnType === "float[]") {
    outputCode = `  for(int i=0;i<_retSize;i++){ if(i>0) printf(" "); printf("%g", result[i]); }`;
  } else if (returnType === "void") {
    outputCode = ``;
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
#define _MAX_LINES 10000
#define _MAX_LINE_LEN 65536

static char* _lines[_MAX_LINES];
static int _lineCount = 0;
static int _lineIdx = 0;

void _readAllInput() {
  char buf[_MAX_LINE_LEN];
  while(fgets(buf, sizeof(buf), stdin)) {
    buf[strcspn(buf, "\\r\\n")] = '\\0';
    _lines[_lineCount++] = strdup(buf);
  }
}

char* _nextLine() {
  if(_lineIdx < _lineCount) return _lines[_lineIdx++];
  return "";
}

${userFunctionCode}

int main() {
  _readAllInput();

${inputParsing}
${retSizeDecl}${resultDecl}
${outputCode}

  return 0;
}
`;
};
