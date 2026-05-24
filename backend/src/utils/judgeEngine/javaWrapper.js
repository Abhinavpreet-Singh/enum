export const generateJavaWrapper = ({
  userFunctionCode,
  functionName,
  parameterTypes,
  returnType
}) => {
  const userImportLines = [];
  const userCodeLines = userFunctionCode.split('\n');
  const filteredCodeLines = [];
  for (const line of userCodeLines) {
    if (/^\s*import\s+/.test(line)) {
      userImportLines.push(line.trim());
    } else {
      filteredCodeLines.push(line);
    }
  }
  userFunctionCode = filteredCodeLines.join('\n');
  const extraImports = userImportLines.length > 0 ? userImportLines.join('\n') + '\n' : '';

  let parsingCode = "";
  let functionParams = "";

  parameterTypes.forEach((type, index) => {
    if (type === "int") {
      parsingCode += `    int param${index} = Integer.parseInt(_lines.get(_li++).trim());\n`;
    } else if (type === "float" || type === "double") {
      parsingCode += `    double param${index} = Double.parseDouble(_lines.get(_li++).trim());\n`;
    } else if (type === "string" || type === "String") {
      parsingCode += `    String param${index} = _lines.get(_li++);\n`;
    } else if (type === "bool") {
      parsingCode += `    boolean param${index} = _lines.get(_li++).trim().equals("true");\n`;
    } else if (type === "int[]") {
      parsingCode += `    int _n${index} = Integer.parseInt(_lines.get(_li++).trim());\n`;
      parsingCode += `    String _vl${index} = _li < _lines.size() ? _lines.get(_li++) : "";\n`;
      parsingCode += `    int[] param${index} = new int[_n${index}];\n`;
      parsingCode += `    if(_n${index} > 0 && !_vl${index}.trim().isEmpty()){ String[] _p = _vl${index}.trim().split("\\\\s+"); for(int i=0;i<_n${index};i++) param${index}[i] = Integer.parseInt(_p[i]); }\n`;
    } else if (type === "string[]" || type === "String[]") {
      parsingCode += `    int _n${index} = Integer.parseInt(_lines.get(_li++).trim());\n`;
      parsingCode += `    String _vl${index} = _li < _lines.size() ? _lines.get(_li++) : "";\n`;
      parsingCode += `    String[] param${index} = (_n${index} > 0 && !_vl${index}.trim().isEmpty()) ? _vl${index}.trim().split("\\\\s+") : new String[0];\n`;
    } else if (type === "float[]" || type === "double[]") {
      parsingCode += `    int _n${index} = Integer.parseInt(_lines.get(_li++).trim());\n`;
      parsingCode += `    String _vl${index} = _li < _lines.size() ? _lines.get(_li++) : "";\n`;
      parsingCode += `    double[] param${index} = new double[_n${index}];\n`;
      parsingCode += `    if(_n${index} > 0 && !_vl${index}.trim().isEmpty()){ String[] _p = _vl${index}.trim().split("\\\\s+"); for(int i=0;i<_n${index};i++) param${index}[i] = Double.parseDouble(_p[i]); }\n`;
    }

    functionParams += `param${index}`;
    if (index !== parameterTypes.length - 1)
      functionParams += ", ";
  });

  const javaReturnTypeMap = {
    int: "int",
    float: "double",
    double: "double",
    string: "String",
    String: "String",
    bool: "boolean",
    "int[]": "int[]",
    "string[]": "String[]",
    "String[]": "String[]",
    "float[]": "double[]",
    void: "void"
  };

  const javaReturn = javaReturnTypeMap[returnType] || "Object";

  let outputCode = "";
  if (returnType === "int" || returnType === "float" || returnType === "double" || returnType === "string" || returnType === "String") {
    outputCode = `    System.out.print(result);`;
  } else if (returnType === "bool") {
    outputCode = `    System.out.print(result ? "true" : "false");`;
  } else if (returnType === "int[]") {
    outputCode = `    StringBuilder sb = new StringBuilder();\n    for(int i=0;i<result.length;i++){ if(i>0) sb.append(" "); sb.append(result[i]); }\n    System.out.print(sb.toString());`;
  } else if (returnType === "string[]" || returnType === "String[]") {
    outputCode = `    StringBuilder sb = new StringBuilder();\n    for(int i=0;i<result.length;i++){ if(i>0) sb.append(" "); sb.append(result[i]); }\n    System.out.print(sb.toString());`;
  } else if (returnType === "float[]" || returnType === "double[]") {
    outputCode = `    StringBuilder sb = new StringBuilder();\n    for(int i=0;i<result.length;i++){ if(i>0) sb.append(" "); sb.append(result[i]); }\n    System.out.print(sb.toString());`;
  } else if (returnType === "void") {
    outputCode = ``;
  } else {
    outputCode = `    System.out.print(result);`;
  }

  const resultDecl = returnType === "void"
    ? `    obj.${functionName}(${functionParams});`
    : `    ${javaReturn} result = obj.${functionName}(${functionParams});`;

  return `import java.util.*;
import java.io.*;
${extraImports}
public class Main {

  ${userFunctionCode}

  public static void main(String[] args) throws Exception {
    BufferedReader _br = new BufferedReader(new InputStreamReader(System.in));
    List<String> _lines = new ArrayList<>();
    String _line;
    while((_line = _br.readLine()) != null) _lines.add(_line);
    int _li = 0;

${parsingCode}

    Main obj = new Main();
${resultDecl}
${outputCode}
  }
}
`;
};
