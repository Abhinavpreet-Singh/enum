/**
 * Generates language-specific function stub templates for LeetCode-style problems.
 */

const cppTypeMap = {
  int: "int",
  float: "double",
  double: "double",
  string: "string",
  bool: "bool",
  "int[]": "vector<int>",
  "string[]": "vector<string>",
  "float[]": "vector<double>",
};

const javaTypeMap = {
  int: "int",
  float: "double",
  double: "double",
  string: "String",
  bool: "boolean",
  "int[]": "int[]",
  "string[]": "String[]",
  "float[]": "double[]",
};

const pythonTypeMap = {
  int: "int",
  float: "float",
  double: "float",
  string: "str",
  bool: "bool",
  "int[]": "List[int]",
  "string[]": "List[str]",
  "float[]": "List[float]",
};

const cTypeMap = {
  int: "int",
  float: "double",
  double: "double",
  string: "char*",
  bool: "int",
  "int[]": "int*",
  "float[]": "double*",
};

export const generatePythonTemplate = ({ functionName, parameterNames, parameterTypes, returnType }) => {
  const params = parameterTypes.map((type, i) => {
    const name = parameterNames?.[i] || `param${i}`;
    const pyType = pythonTypeMap[type] || "any";
    return `${name}: ${pyType}`;
  });
  const pyReturn = pythonTypeMap[returnType] || "any";
  return `def ${functionName}(${params.join(", ")}) -> ${pyReturn}:
    # Write your code here
    pass
`;
};

export const generateCppTemplate = ({ functionName, parameterNames, parameterTypes, returnType }) => {
  const params = parameterTypes.map((type, i) => {
    const name = parameterNames?.[i] || `param${i}`;
    const cppType = cppTypeMap[type] || "auto";
    if (type.endsWith("[]")) {
      return `${cppType}& ${name}`;
    }
    return `${cppType} ${name}`;
  });
  const cppReturn = cppTypeMap[returnType] || "auto";
  return `${cppReturn} ${functionName}(${params.join(", ")}) {
    // Write your code here
}
`;
};

export const generateJavaTemplate = ({ functionName, parameterNames, parameterTypes, returnType }) => {
  const params = parameterTypes.map((type, i) => {
    const name = parameterNames?.[i] || `param${i}`;
    const javaType = javaTypeMap[type] || "Object";
    return `${javaType} ${name}`;
  });
  const javaReturn = javaTypeMap[returnType] || "Object";
  return `public ${javaReturn} ${functionName}(${params.join(", ")}) {
    // Write your code here
}
`;
};

export const generateCTemplate = ({ functionName, parameterNames, parameterTypes, returnType }) => {
  const params = parameterTypes.map((type, i) => {
    const name = parameterNames?.[i] || `param${i}`;
    if (type === "int[]") {
      return `int* ${name}, int ${name}Size`;
    }
    if (type === "float[]") {
      return `double* ${name}, int ${name}Size`;
    }
    const cType = cTypeMap[type] || "int";
    return `${cType} ${name}`;
  });
  if (returnType === "int[]" || returnType === "float[]") {
    params.push("int* returnSize");
  }
  const cReturn = cTypeMap[returnType] || "int";
  return `${cReturn} ${functionName}(${params.join(", ")}) {
    // Write your code here
}
`;
};

export const generateAllTemplates = ({ functionName, parameterNames, parameterTypes, returnType }) => {
  const args = { functionName, parameterNames, parameterTypes, returnType };
  return {
    python: generatePythonTemplate(args),
    cpp: generateCppTemplate(args),
    java: generateJavaTemplate(args),
    c: generateCTemplate(args),
  };
};
