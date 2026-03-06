import { proxy } from "@/app/proxy";
import axios from "axios";

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
    input: string[] | string;
    output: string;
    expectedOutput?: string;
  }[];
  constraints: string[];
  initialCode: {
    python?: string;
    java?: string;
    c?: string;
    cpp?: string;
  };
}

// Backend question interface
interface BackendQuestion {
  _id?: string;
  id?: string;
  title: string;
  desc: string;
  level: "Easy" | "Medium" | "Hard";
  testcases: Array<{ input: string[] | string; output?: string; expectedOutput?: string }>;
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
}

let questions: Question[] = [];

export const fetchQuestions = async (): Promise<Question[]> => {
  try {
    const response = await axios.get(`${proxy}/api/v1/questions/getQuestion`);
    console.log("Questions fetched:", response.data);

    // Map backend data to frontend Question interface
    if (response.data && response.data.data) {
      questions = response.data.data.map((q: BackendQuestion) => {
        // Ensure constraints is an array of strings
        let constraintsArray: string[] = [];
        if (typeof q.constraints === 'string' && q.constraints.trim()) {
          constraintsArray = q.constraints.split('\n').filter(c => c.trim());
        } else if (Array.isArray(q.constraints)) {
          constraintsArray = q.constraints.map(c => String(c));
        }

        // Parse initialCode from backend (auto-generated or manual)
        let initialCodeObj: {
          python?: string;
          java?: string;
          c?: string;
          cpp?: string;
        } = {};

        if (Array.isArray(q.initialCode) && q.initialCode.length > 0) {
          // Merge all objects in the array
          q.initialCode.forEach((codeObj) => {
            initialCodeObj = { ...initialCodeObj, ...codeObj };
          });
        }

        // Map testcases - support both old and new format
        const examples = Array.isArray(q.testcases) ? q.testcases.map((tc) => {
          const input = tc.input;
          const expectedOutput = tc.expectedOutput || tc.output || "";
          // For display, format input nicely
          const displayInput = Array.isArray(input) ? input.join("\n") : String(input || "");
          return {
            input: displayInput,
            output: String(expectedOutput),
            expectedOutput: String(expectedOutput),
          };
        }) : [];

        return {
          id: q._id ?? q.id ?? '',
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
          initialCode: initialCodeObj
        };
      });
    }

    return questions;
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
};

export const getQuestions = (): Question[] => {
  return questions;
};

export { questions };