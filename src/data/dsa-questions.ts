import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import { getAdminRequestConfig } from "@/lib/admin-api";
import {
  formatTestCaseInputDisplay,
  formatTestCaseOutputDisplay,
} from "@/lib/format-test-case-display";
export interface Question {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  description: string;
  // Function metadata for LeetCode-style
  functionName: string;
  parameterNames: string[];
  parameterTypes: string[];
  returnType: string;
  examples: {
    input: string;
    output: string;
    expectedOutput?: string;
    isHidden?: boolean;
  }[];
  constraints: string[];
  initialCode: {
    python?: string;
    java?: string;
    c?: string;
    cpp?: string;
  };
  status?: {
    attempted: boolean;
    solved: boolean;
    attempts?: number;
  };
}

// Backend question interface
interface BackendQuestion {
  _id?: string;
  id?: string;
  title: string;
  desc: string;
  level: "Easy" | "Medium" | "Hard";
  testcases: Array<{
    input: string[] | string;
    output?: string;
    expectedOutput?: string;
    isHidden?: boolean;
  }>;
  constraints: string;
  topic: string;
  functionName?: string;
  parameterNames?: string[];
  parameterTypes?: string[];
  returnType?: string;
  initialCode?: Array<{
    python?: string;
    java?: string;
    c?: string;
    cpp?: string;
  }>;
  status?: {
    attempted: boolean;
    solved: boolean;
    attempts?: number;
  };
}

let questions: Question[] = [];

function mapBackendQuestion(q: BackendQuestion): Question {
  let constraintsArray: string[] = [];
  if (typeof q.constraints === "string" && q.constraints.trim()) {
    constraintsArray = q.constraints.split("\n").filter((c) => c.trim());
  } else if (Array.isArray(q.constraints)) {
    constraintsArray = q.constraints.map((c) => String(c));
  }

  let initialCodeObj: {
    python?: string;
    java?: string;
    c?: string;
    cpp?: string;
  } = {};

  if (Array.isArray(q.initialCode) && q.initialCode.length > 0) {
    q.initialCode.forEach((codeObj) => {
      initialCodeObj = { ...initialCodeObj, ...codeObj };
    });
  }

  const parameterNames = q.parameterNames || [];
  const parameterTypes = q.parameterTypes || [];
  const returnType = q.returnType || "int";

  const examples = Array.isArray(q.testcases)
    ? q.testcases.map((tc) => {
        const input = tc.input;
        const expectedOutput = tc.expectedOutput || tc.output || "";
        const displayInput = formatTestCaseInputDisplay(
          input,
          parameterNames,
          parameterTypes,
        );
        const displayOutput = formatTestCaseOutputDisplay(
          String(expectedOutput),
          returnType,
        );
        return {
          input: displayInput,
          output: displayOutput,
          expectedOutput: displayOutput,
          isHidden: Boolean(tc.isHidden),
        };
      })
    : [];

  return {
    id: q._id ?? q.id ?? "",
    title: q.title || "Untitled",
    difficulty: q.level || "Easy",
    category: q.topic || "General",
    description: q.desc || "",
    functionName: q.functionName || "",
    parameterNames: q.parameterNames || [],
    parameterTypes: q.parameterTypes || [],
    returnType: q.returnType || "int",
    examples,
    constraints: constraintsArray,
    initialCode: initialCodeObj,
    status: q.status || { attempted: false, solved: false, attempts: 0 },
  };
}

export const fetchQuestions = async (): Promise<Question[]> => {
  try {
    const response = await api.get("/api/v1/questions/getQuestion", {
      withCredentials: true,
    });
    console.log("Questions fetched:", response.data);

    if (response.data && response.data.data) {
      questions = response.data.data.map((q: BackendQuestion) =>
        mapBackendQuestion(q),
      );
    }

    return questions;
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
};

export const fetchAdminQuestions = async (): Promise<Question[]> => {
  try {
    const response = await api.get(
      "/api/v1/admin/dsa-questions",
      getAdminRequestConfig(),
    );
    if (response.data && response.data.data) {
      return response.data.data.map((q: BackendQuestion) =>
        mapBackendQuestion(q),
      );
    }
    return [];
  } catch (error) {
    console.error("Error fetching admin questions:", error);
    return [];
  }
};

export const getQuestions = (): Question[] => {
  return questions;
};

export { questions };
