// ─── Type mapping: C++ source types → internal judge type names ──────────────
const CPP_TO_INTERNAL = {
  int: "int", long: "int", "long long": "int", short: "int",
  float: "double", double: "double",
  string: "String", "std::string": "String",
  bool: "bool",
  "int*": "int[]", "vector<int>": "int[]",
  "vector<vector<int>>": "int[][]",
  "double*": "double[]", "float*": "double[]", "vector<double>": "double[]", "vector<float>": "double[]",
  "string*": "String[]", "vector<string>": "String[]",
  void: "void",
};

/**
 * Try to extract the first non-main function signature from C++ source.
 * Returns { functionName, parameterTypes, returnType } or null.
 */
function parseCppSignature(code) {
  // Match: returnType funcName(params) { — skip includes/using/struct/class lines
  const funcRe = /([\w:<>*&\s]+?)\s+(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?\{/g;

  let match;
  while ((match = funcRe.exec(code)) !== null) {
    const rawReturn = match[1].trim();
    const funcName  = match[2].trim();
    const paramsStr = match[3].trim();

    if (funcName === "main" || funcName === "if" || funcName === "while" ||
        funcName === "for" || funcName === "switch") continue;
    if (!rawReturn || rawReturn.endsWith("#include") || rawReturn === "class" ||
        rawReturn === "struct") continue;

    const returnType = CPP_TO_INTERNAL[rawReturn] || rawReturn;

    const parameterTypes = paramsStr
      ? paramsStr.split(",").map((p) => {
          // Strip references/pointers: "int& nums" → "int", "vector<int>& v" → "vector<int>"
          const clean = p.replace(/&/g, "").replace(/\*/g, "").trim();
          const rawType = clean.split(/\s+/)[0] || "";
          return CPP_TO_INTERNAL[rawType] || rawType;
        }).filter(Boolean)
      : [];

    return { functionName: funcName, parameterTypes, returnType };
  }
  return null;
}

/**
 * Build token-based input parsing + function-call + output code for C++.
 */
function buildCppHarness(functionName, parameterTypes, returnType, userFunctionCode) {
  const includeLines = [];
  const bodyLines = [];
  for (const line of userFunctionCode.split("\n")) {
    if (/^\s*#include\s+/.test(line) || /^\s*using\s+namespace\s+/.test(line)) {
      includeLines.push(line.trim());
    } else {
      bodyLines.push(line);
    }
  }
  const extraIncludes = includeLines.length ? includeLines.join("\n") + "\n" : "";
  const cleanCode = bodyLines.join("\n");

  // Token reader preamble
  const readerPreamble = `
  istringstream _iss([](){
    string _all, _l;
    while(getline(cin, _l)){ _all += _l + ' '; }
    return _all;
  }());
  auto _next_tok = [&]() -> string {
    string t; _iss >> t; return t;
  };`;

  let inputParsing = "";
  let functionParams = "";

  parameterTypes.forEach((type, idx) => {
    if (type === "int") {
      inputParsing += `  int param${idx} = stoi(_next_tok());\n`;
    } else if (type === "double" || type === "float") {
      inputParsing += `  double param${idx} = stod(_next_tok());\n`;
    } else if (type === "String" || type === "string") {
      inputParsing += `  string param${idx} = _next_tok();\n`;
    } else if (type === "bool") {
      inputParsing += `  bool param${idx} = (_next_tok() == "true");\n`;
    } else if (type === "int[]") {
      inputParsing += `  int _n${idx} = stoi(_next_tok());\n`;
      inputParsing += `  vector<int> param${idx}(_n${idx});\n`;
      inputParsing += `  for(int _i=0;_i<_n${idx};_i++) param${idx}[_i] = stoi(_next_tok());\n`;
    } else if (type === "double[]" || type === "float[]") {
      inputParsing += `  int _n${idx} = stoi(_next_tok());\n`;
      inputParsing += `  vector<double> param${idx}(_n${idx});\n`;
      inputParsing += `  for(int _i=0;_i<_n${idx};_i++) param${idx}[_i] = stod(_next_tok());\n`;
    } else if (type === "String[]" || type === "string[]") {
      inputParsing += `  int _n${idx} = stoi(_next_tok());\n`;
      inputParsing += `  vector<string> param${idx}(_n${idx});\n`;
      inputParsing += `  for(int _i=0;_i<_n${idx};_i++) param${idx}[_i] = _next_tok();\n`;
    } else if (type === "int[][]") {
      inputParsing += `  int _rows${idx} = stoi(_next_tok());\n`;
      inputParsing += `  int _cols${idx} = stoi(_next_tok());\n`;
      inputParsing += `  vector<vector<int>> param${idx}(_rows${idx}, vector<int>(_cols${idx}));\n`;
      inputParsing += `  for(int _r=0;_r<_rows${idx};_r++) for(int _c=0;_c<_cols${idx};_c++) param${idx}[_r][_c] = stoi(_next_tok());\n`;
    } else {
      inputParsing += `  string param${idx} = _next_tok();\n`;
    }

    functionParams += `param${idx}`;
    if (idx < parameterTypes.length - 1) functionParams += ", ";
  });

  let outputCode = "";
  if (returnType === "int" || returnType === "double" || returnType === "float" ||
             returnType === "String" || returnType === "string") {
    outputCode = `  cout << result;`;
  } else if (returnType === "bool") {
    outputCode = `  cout << (result ? "true" : "false");`;
  } else if (returnType === "int[]" || returnType === "double[]" || returnType === "float[]" ||
             returnType === "String[]" || returnType === "string[]") {
    outputCode = `  for(int _i=0;_i<(int)result.size();_i++){ if(_i>0) cout<<' '; cout<<result[_i]; }`;
  } else if (returnType === "void") {
    outputCode = "";
  } else {
    outputCode = `  cout << result;`;
  }

  const resultDecl = returnType === "void"
    ? `  ${functionName}(${functionParams});`
    : `  auto result = ${functionName}(${functionParams});`;

  return `#include <bits/stdc++.h>
using namespace std;
${extraIncludes}
${cleanCode}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(NULL);
  ${readerPreamble}

${inputParsing}
${resultDecl}
${outputCode}

  return 0;
}
`;
}

// ─── Public export ────────────────────────────────────────────────────────────

export const generateCppWrapper = ({
  userFunctionCode,
  functionName,
  parameterTypes,
  returnType,
}) => {
  // 1) Explicit metadata provided
  if (functionName && Array.isArray(parameterTypes) && parameterTypes.length > 0) {
    return buildCppHarness(functionName, parameterTypes, returnType, userFunctionCode);
  }

  // 2) Complete program with main — run as-is (class-based OOP questions)
  const hasIncludes = /#include/.test(userFunctionCode);
  const hasMain = /\bmain\s*\(/.test(userFunctionCode);

  if (hasMain) {
    const prefix = hasIncludes ? "" : "#include <bits/stdc++.h>\nusing namespace std;\n";
    return prefix + userFunctionCode;
  }

  // 3) Auto-detect function signature
  const detected = parseCppSignature(userFunctionCode);
  if (detected && detected.parameterTypes.length > 0) {
    return buildCppHarness(
      detected.functionName,
      detected.parameterTypes,
      detected.returnType,
      userFunctionCode,
    );
  }

  // Can't figure it out — wrap with a placeholder main
  return `#include <bits/stdc++.h>
using namespace std;

${userFunctionCode}

int main() {
  // TODO: Could not auto-detect function signature.
  // Please write a complete program with main(), or ask your administrator
  // to set functionName/parameterTypes/returnType for this question.
  cout << "ERROR: incomplete program" << endl;
  return 1;
}
`;
};
