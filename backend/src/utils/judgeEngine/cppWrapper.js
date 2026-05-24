export const generateCppWrapper = ({
  userFunctionCode,
  functionName,
  parameterTypes,
  returnType
}) => {
  const userIncludeLines = [];
  const userCodeLines = userFunctionCode.split('\n');
  const filteredCodeLines = [];
  for (const line of userCodeLines) {
    if (/^\s*#include\s+/.test(line) || /^\s*using\s+namespace\s+/.test(line)) {
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
      inputParsing += `  int param${index} = stoi(_nextLine());\n`;
    } else if (type === "float" || type === "double") {
      inputParsing += `  double param${index} = stod(_nextLine());\n`;
    } else if (type === "string") {
      inputParsing += `  string param${index} = _nextLine();\n`;
    } else if (type === "bool") {
      inputParsing += `  bool param${index} = (_nextLine() == "true");\n`;
    } else if (type === "int[]") {
      inputParsing += `  int _n${index} = stoi(_nextLine());\n`;
      inputParsing += `  vector<int> param${index}(_n${index});\n`;
      inputParsing += `  { string _vl = _nextLine(); if(!_vl.empty()){ istringstream _is(_vl); for(int i=0;i<_n${index};i++) _is >> param${index}[i]; } }\n`;
    } else if (type === "string[]") {
      inputParsing += `  int _n${index} = stoi(_nextLine());\n`;
      inputParsing += `  vector<string> param${index}(_n${index});\n`;
      inputParsing += `  { string _vl = _nextLine(); if(!_vl.empty()){ istringstream _is(_vl); for(int i=0;i<_n${index};i++) _is >> param${index}[i]; } }\n`;
    } else if (type === "float[]") {
      inputParsing += `  int _n${index} = stoi(_nextLine());\n`;
      inputParsing += `  vector<double> param${index}(_n${index});\n`;
      inputParsing += `  { string _vl = _nextLine(); if(!_vl.empty()){ istringstream _is(_vl); for(int i=0;i<_n${index};i++) _is >> param${index}[i]; } }\n`;
    }

    functionParams += `param${index}`;
    if (index !== parameterTypes.length - 1) {
      functionParams += ", ";
    }
  });

  let outputCode = "";
  if (returnType === "int" || returnType === "float" || returnType === "double" || returnType === "string") {
    outputCode = `  cout << result;`;
  } else if (returnType === "bool") {
    outputCode = `  cout << (result ? "true" : "false");`;
  } else if (returnType === "int[]" || returnType === "float[]" || returnType === "string[]") {
    outputCode = `  for(int i=0;i<(int)result.size();i++){ if(i>0) cout << " "; cout << result[i]; }`;
  } else if (returnType === "void") {
    outputCode = ``;
  } else {
    outputCode = `  cout << result;`;
  }

  const resultDecl = returnType === "void"
    ? `  ${functionName}(${functionParams});`
    : `  auto result = ${functionName}(${functionParams});`;

  return `#include <bits/stdc++.h>
using namespace std;
${extraIncludes}
static vector<string> _allLines;
static int _lineIdx = 0;
string _nextLine() { return _lineIdx < (int)_allLines.size() ? _allLines[_lineIdx++] : ""; }

${userFunctionCode}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(NULL);
  string _l;
  while(getline(cin, _l)) {
    if(!_l.empty() && _l.back() == '\\r') _l.pop_back();
    _allLines.push_back(_l);
  }

${inputParsing}

${resultDecl}
${outputCode}

  return 0;
}
`;
};
