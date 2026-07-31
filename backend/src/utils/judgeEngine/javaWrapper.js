// ─── Type mapping: Java source types → internal judge type names ────────────
const JAVA_TO_INTERNAL = {
  int: "int", long: "int", short: "int", byte: "int", Integer: "int", Long: "int",
  float: "double", double: "double", Float: "double", Double: "double",
  String: "String", string: "String",
  boolean: "bool", Boolean: "bool",
  "int[]": "int[]", "long[]": "int[]", "Integer[]": "int[]",
  "double[]": "double[]", "float[]": "double[]", "Double[]": "double[]",
  "String[]": "String[]",
  void: "void",
};

/**
 * Try to extract the first non-main method signature from Java source code.
 * Returns { functionName, parameterTypes, returnType } or null.
 */
function parseJavaSignature(code) {
  // Match: [modifier] [static] returnType methodName(params) [throws ...] {
  const methodRe = /(?:(?:public|private|protected)\s+)?(?:static\s+)?([\w<>\[\]]+)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*\{/g;

  let match;
  while ((match = methodRe.exec(code)) !== null) {
    const rawReturn = match[1].trim();
    const funcName  = match[2].trim();
    const paramsStr = match[3].trim();

    // Skip main method and constructors (uppercase first letter)
    if (funcName === "main" || /^[A-Z]/.test(funcName)) continue;
    // Skip if return type looks like a class (accessor methods etc.)
    if (!rawReturn) continue;

    const returnType = JAVA_TO_INTERNAL[rawReturn] || rawReturn;

    const parameterTypes = paramsStr
      ? paramsStr.split(",").map((p) => {
          const javaType = p.trim().split(/\s+/)[0] || "";
          return JAVA_TO_INTERNAL[javaType] || javaType;
        })
      : [];

    return { functionName: funcName, parameterTypes, returnType };
  }
  return null;
}

// ─── Code generator ───────────────────────────────────────────────────────────

/**
 * Build token-based input parsing + function-call + output printing code for Java.
 * Uses whitespace tokens so inputs can be on one line OR multiple lines.
 */
function buildJavaHarness(functionName, parameterTypes, returnType, userFunctionCode) {
  // Strip import lines so we can re-emit them at the top
  const userImportLines = [];
  const bodyLines = [];
  for (const line of userFunctionCode.split("\n")) {
    if (/^\s*import\s+/.test(line)) userImportLines.push(line.trim());
    else bodyLines.push(line);
  }
  const extraImports = userImportLines.length ? userImportLines.join("\n") + "\n" : "";
  const cleanCode = bodyLines.join("\n");

  // Token reader preamble (reads all stdin as whitespace-split tokens)
  const readerPreamble = `
    String[] _tok;
    {
      StringBuilder _sb = new StringBuilder();
      java.io.BufferedReader _br2 = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
      String _l2;
      while((_l2 = _br2.readLine()) != null){ _sb.append(_l2).append(' '); }
      String _raw = _sb.toString().trim();
      _tok = _raw.isEmpty() ? new String[0] : _raw.split("\\\\s+");
    }
    int _ti = 0;`;

  // Build per-parameter parsing
  let parsingCode = "";
  let functionParams = "";

  parameterTypes.forEach((type, idx) => {
    if (type === "int") {
      parsingCode += `    int param${idx} = Integer.parseInt(_tok[_ti++]);\n`;
    } else if (type === "double" || type === "float") {
      parsingCode += `    double param${idx} = Double.parseDouble(_tok[_ti++]);\n`;
    } else if (type === "String" || type === "string") {
      parsingCode += `    String param${idx} = _tok[_ti++];\n`;
    } else if (type === "bool") {
      parsingCode += `    boolean param${idx} = _tok[_ti++].equals("true");\n`;
    } else if (type === "int[]") {
      parsingCode += `    int _n${idx} = Integer.parseInt(_tok[_ti++]);\n`;
      parsingCode += `    int[] param${idx} = new int[_n${idx}];\n`;
      parsingCode += `    for(int _i=0;_i<_n${idx};_i++) param${idx}[_i] = Integer.parseInt(_tok[_ti++]);\n`;
    } else if (type === "double[]" || type === "float[]") {
      parsingCode += `    int _n${idx} = Integer.parseInt(_tok[_ti++]);\n`;
      parsingCode += `    double[] param${idx} = new double[_n${idx}];\n`;
      parsingCode += `    for(int _i=0;_i<_n${idx};_i++) param${idx}[_i] = Double.parseDouble(_tok[_ti++]);\n`;
    } else if (type === "String[]" || type === "string[]") {
      parsingCode += `    int _n${idx} = Integer.parseInt(_tok[_ti++]);\n`;
      parsingCode += `    String[] param${idx} = new String[_n${idx}];\n`;
      parsingCode += `    for(int _i=0;_i<_n${idx};_i++) param${idx}[_i] = _tok[_ti++];\n`;
    } else {
      // Unknown type — treat as String token
      parsingCode += `    String param${idx} = _tok[_ti++];\n`;
    }

    functionParams += `param${idx}`;
    if (idx < parameterTypes.length - 1) functionParams += ", ";
  });

  // Return type mapping
  const javaReturnTypeMap = {
    int: "int", double: "double", float: "double", String: "String", string: "String",
    bool: "boolean", "int[]": "int[]", "double[]": "double[]", "float[]": "double[]",
    "String[]": "String[]", void: "void",
  };
  const javaReturn = javaReturnTypeMap[returnType] || "Object";

  // Output code
  let outputCode = "";
  if (returnType === "int" || returnType === "double" || returnType === "float" ||
      returnType === "String" || returnType === "string") {
    outputCode = `    System.out.print(result);`;
  } else if (returnType === "bool") {
    outputCode = `    System.out.print(result ? "true" : "false");`;
  } else if (returnType === "int[]" || returnType === "double[]" || returnType === "float[]") {
    outputCode = `    StringBuilder _out = new StringBuilder();\n    for(int _i=0;_i<result.length;_i++){ if(_i>0) _out.append(' '); _out.append(result[_i]); }\n    System.out.print(_out);`;
  } else if (returnType === "String[]" || returnType === "string[]") {
    outputCode = `    StringBuilder _out = new StringBuilder();\n    for(int _i=0;_i<result.length;_i++){ if(_i>0) _out.append(' '); _out.append(result[_i]); }\n    System.out.print(_out);`;
  } else if (returnType === "void") {
    outputCode = "";
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

  ${cleanCode}

  public static void main(String[] args) throws Exception {
    ${readerPreamble}

${parsingCode}
    Main obj = new Main();
${resultDecl}
${outputCode}
  }
}
`;
}

// ─── Public export ────────────────────────────────────────────────────────────

export const generateJavaWrapper = ({
  userFunctionCode,
  functionName,
  parameterTypes,
  returnType,
}) => {
  // 1) Explicit metadata provided (question was set up with function info)
  if (functionName && Array.isArray(parameterTypes) && parameterTypes.length > 0) {
    return buildJavaHarness(functionName, parameterTypes, returnType, userFunctionCode);
  }

  // 2) Complete program with main — run as-is (class-based OOP questions)
  if (/public\s+static\s+void\s+main\s*\(/.test(userFunctionCode)) {
    if (/\bclass\s+Main\b/.test(userFunctionCode)) {
      return userFunctionCode;
    }
    return `import java.util.*;
import java.io.*;
${userFunctionCode}
`;
  }

  // 3) No metadata — try to auto-detect the function signature from the code
  const detected = parseJavaSignature(userFunctionCode);
  if (detected) {
    return buildJavaHarness(
      detected.functionName,
      detected.parameterTypes,
      detected.returnType,
      userFunctionCode,
    );
  }

  // 4) Fallback: can't figure out the structure — tell the candidate to write a complete class
  return `import java.util.*;
import java.io.*;

// TODO: Could not auto-detect your method signature.
// Please write a complete class with a public static void main(String[] args) method.
public class Main {
  public static void main(String[] args) {
    System.out.println("ERROR: Please write a complete Java program with a main method, or ask your administrator to set function metadata for this question.");
  }

${userFunctionCode}
}
`;
};
