import { proxy } from "@/app/proxy";
import axios from "axios";

export interface Question {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  description: string;
  examples: {
    input: string;
    output: string;
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
  _id: string;
  title: string;
  desc: string;
  level: "Easy" | "Medium" | "Hard";
  testcases: Array<{ input: string; output: string }>;
  constraints: string;
  topic: string;
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

        // Parse initialCode from backend
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

        // Fallback to default templates if not provided
        if (!initialCodeObj.python && !initialCodeObj.java && !initialCodeObj.c && !initialCodeObj.cpp) {
          initialCodeObj = {
            python: `# Read input
import sys

def solve():
    data = sys.stdin.read().strip().split()
    pass

if __name__ == "__main__":
    solve()
`,
            java: `import java.util.*;

public class Main {
    public static void solve(Scanner sc) {
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        solve(sc);
        sc.close();
    }
}`,
            c: `#include <stdio.h>

void solve() {
}

int main() {
    solve();
    return 0;
}
`,
            cpp: `#include <bits/stdc++.h>
using namespace std;

void solve() {
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(NULL);
    solve();
    return 0;
}
`
          };
        }

        return {
          id: q._id,
          title: q.title || "Untitled",
          difficulty: q.level || "Easy",
          category: q.topic || "General",
          description: q.desc || "",
          examples: Array.isArray(q.testcases) ? q.testcases.map((tc, index) => ({
            input: String(tc.input || ""),
            output: String(tc.output || ""),
            explanation: index === 0 ? "Example test case" : `Test case ${index + 1}`
          })) : [],
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