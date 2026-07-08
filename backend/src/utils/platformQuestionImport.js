/** Map platform DSA / Linux questions into BankQuestion create payloads. */

import { formatBankTestCaseInput } from "./judgeEngine/testCaseInput.js";

function normalizeDifficulty(value, fallback = "medium") {
  const d = String(value || fallback).toLowerCase();
  if (d === "easy" || d === "medium" || d === "hard") return d;
  if (d === "beginner") return "easy";
  if (d === "intermediate") return "medium";
  if (d === "advanced") return "hard";
  return fallback;
}

function pickCodeTemplate(initialCode) {
  if (!Array.isArray(initialCode) || initialCode.length === 0) return "";
  const merged = initialCode.reduce((acc, entry) => ({ ...acc, ...entry }), {});
  return (
    merged.python ||
    merged.javascript ||
    merged.java ||
    merged.cpp ||
    merged.c ||
    Object.values(merged).find((v) => typeof v === "string" && v.trim()) ||
    ""
  );
}

function normalizeTestCases(testcases, parameterTypes = []) {
  if (!Array.isArray(testcases)) return [];
  return testcases.map((tc) => {
    const expectedOutput = tc?.expectedOutput ?? tc?.output ?? "";
    return {
      input: formatBankTestCaseInput(tc?.input, parameterTypes),
      expectedOutput: String(expectedOutput),
      isHidden: Boolean(tc?.isHidden),
    };
  });
}

export function mapDsaQuestionToBankPayload(q) {
  const difficulty = normalizeDifficulty(q.level, "medium");
  return {
    type: "coding",
    title: q.title?.trim() || "Untitled DSA Question",
    description: q.desc?.trim() || "",
    difficulty,
    options: null,
    correctAnswer: null,
    codeTemplate: pickCodeTemplate(q.initialCode),
    testCases: normalizeTestCases(q.testcases, q.parameterTypes || []),
    functionName: q.functionName || null,
    parameterTypes: q.parameterTypes || [],
    returnType: q.returnType || null,
    points: difficulty === "hard" ? 20 : difficulty === "medium" ? 15 : 10,
    tags: ["dsa", "imported", "enum-platform"],
    technology: "python",
    topic: q.topic?.trim() || "Algorithms",
  };
}

export function mapLinuxQuestionToBankPayload(q) {
  const difficulty = normalizeDifficulty(q.difficulty, "easy");
  const extra = [];
  if (Array.isArray(q.examples) && q.examples.length > 0) {
    extra.push(
      "Examples:\n" +
        q.examples
          .map((ex) => `• ${ex.input} → ${ex.output}`)
          .join("\n"),
    );
  }
  if (Array.isArray(q.constraints) && q.constraints.length > 0) {
    extra.push("Constraints: " + q.constraints.join("; "));
  }
  if (Array.isArray(q.hints) && q.hints.length > 0) {
    extra.push("Hints: " + q.hints.join("; "));
  }

  const description = [q.description?.trim() || "", ...extra].filter(Boolean).join("\n\n");

  return {
    type: "linux",
    title: q.title?.trim() || "Untitled Linux Question",
    description,
    difficulty,
    options: null,
    correctAnswer: null,
    codeTemplate: q.starterCode?.trim() || "#!/usr/bin/env bash\n",
    testCases: [
      {
        input: "",
        expectedOutput: String(q.expectedOutput ?? ""),
        isHidden: false,
      },
    ],
    functionName: null,
    parameterTypes: [],
    returnType: null,
    points: difficulty === "hard" ? 20 : difficulty === "medium" ? 15 : 10,
    tags: ["linux", "imported", "enum-platform"],
    technology: "bash",
    topic: "Shell",
  };
}

export function mapSystemDesignToBankPayload(sim) {
  const difficulty = normalizeDifficulty(sim.difficulty, "medium");
  const rules = Array.isArray(sim.evaluationRules) ? sim.evaluationRules : [];
  const rulesSummary = rules.length
    ? "Evaluation criteria:\n" +
      rules
        .map((r) => `• ${r.description || r.requiredComponent || r.requiredEdge || "Component rule"}`)
        .join("\n")
    : "";

  const description = [sim.description?.trim() || "", rulesSummary].filter(Boolean).join("\n\n");

  return {
    type: "system_design",
    title: sim.title?.trim() || "Untitled System Design",
    description,
    difficulty,
    options: null,
    correctAnswer: {
      platformSource: "system_design",
      platformId: sim.id,
      templateUrl: sim.templateUrl || "",
      maxScore: sim.maxScore || 10,
    },
    codeTemplate: null,
    testCases: [],
    functionName: null,
    parameterTypes: [],
    returnType: null,
    points: sim.maxScore || (difficulty === "hard" ? 25 : difficulty === "medium" ? 15 : 10),
    tags: ["system_design", "imported", "enum-platform"],
    technology: "system-design",
    topic: "Architecture",
  };
}

export const PLATFORM_SOURCE_LABELS = {
  dsa: "DSA Arena",
  linux: "Linux Arena",
  system_design: "System Design",
};

export const SAMPLE_MCQ_PACKS = {
  dsa: [
    {
      title: "Time Complexity of Binary Search",
      description: "What is the average time complexity of binary search on a sorted array?",
      difficulty: "easy",
      options: [
        { text: "O(n)", isCorrect: false },
        { text: "O(log n)", isCorrect: true },
        { text: "O(n log n)", isCorrect: false },
        { text: "O(1)", isCorrect: false },
      ],
      topic: "Algorithms",
    },
    {
      title: "Stack vs Queue",
      description: "Which data structure follows LIFO (Last In, First Out)?",
      difficulty: "easy",
      options: [
        { text: "Queue", isCorrect: false },
        { text: "Stack", isCorrect: true },
        { text: "Deque", isCorrect: false },
        { text: "Priority Queue", isCorrect: false },
      ],
      topic: "Data Structures",
    },
    {
      title: "Hash Map Average Lookup",
      description: "What is the average-case time complexity of lookup in a hash map?",
      difficulty: "medium",
      options: [
        { text: "O(1)", isCorrect: true },
        { text: "O(log n)", isCorrect: false },
        { text: "O(n)", isCorrect: false },
        { text: "O(n²)", isCorrect: false },
      ],
      topic: "Data Structures",
    },
    {
      title: "Recursion Base Case",
      description: "Why is a base case required in recursive functions?",
      difficulty: "easy",
      options: [
        { text: "To improve performance only", isCorrect: false },
        { text: "To prevent infinite recursion", isCorrect: true },
        { text: "To enable multithreading", isCorrect: false },
        { text: "To sort input automatically", isCorrect: false },
      ],
      topic: "Recursion",
    },
    {
      title: "Dynamic Programming Property",
      description: "Dynamic programming is most effective when a problem has:",
      difficulty: "medium",
      options: [
        { text: "Overlapping subproblems and optimal substructure", isCorrect: true },
        { text: "Only greedy choices", isCorrect: false },
        { text: "No repeated states", isCorrect: false },
        { text: "Exponential brute-force only", isCorrect: false },
      ],
      topic: "Dynamic Programming",
    },
  ],
  linux: [
    {
      title: "List Directory Contents",
      description: "Which command lists files and directories in the current directory?",
      difficulty: "easy",
      options: [
        { text: "ls", isCorrect: true },
        { text: "cd", isCorrect: false },
        { text: "pwd", isCorrect: false },
        { text: "mkdir", isCorrect: false },
      ],
      topic: "Linux Basics",
    },
    {
      title: "File Permissions",
      description: "Which permission letter means 'execute' for the owner?",
      difficulty: "easy",
      options: [
        { text: "r", isCorrect: false },
        { text: "w", isCorrect: false },
        { text: "x", isCorrect: true },
        { text: "e", isCorrect: false },
      ],
      topic: "Permissions",
    },
    {
      title: "Process Listing",
      description: "Which command shows running processes?",
      difficulty: "medium",
      options: [
        { text: "ps", isCorrect: true },
        { text: "grep", isCorrect: false },
        { text: "chmod", isCorrect: false },
        { text: "touch", isCorrect: false },
      ],
      topic: "Processes",
    },
    {
      title: "Pipe Operator",
      description: "What does the `|` operator do in a shell command?",
      difficulty: "medium",
      options: [
        { text: "Redirects stderr", isCorrect: false },
        { text: "Sends stdout of one command as stdin to another", isCorrect: true },
        { text: "Runs commands in parallel always", isCorrect: false },
        { text: "Creates a background job", isCorrect: false },
      ],
      topic: "Shell",
    },
  ],
  system_design: [
    {
      title: "Load Balancer Purpose",
      description: "What is the primary role of a load balancer in a web architecture?",
      difficulty: "easy",
      options: [
        { text: "Store user sessions in a database", isCorrect: false },
        { text: "Distribute incoming traffic across multiple servers", isCorrect: true },
        { text: "Compile frontend assets", isCorrect: false },
        { text: "Replace DNS entirely", isCorrect: false },
      ],
      topic: "Architecture",
    },
    {
      title: "Horizontal vs Vertical Scaling",
      description: "Adding more servers to handle load is called:",
      difficulty: "easy",
      options: [
        { text: "Vertical scaling", isCorrect: false },
        { text: "Horizontal scaling", isCorrect: true },
        { text: "Cache warming", isCorrect: false },
        { text: "Sharding only", isCorrect: false },
      ],
      topic: "Scalability",
    },
    {
      title: "CDN Benefit",
      description: "A CDN primarily helps by:",
      difficulty: "medium",
      options: [
        { text: "Serving static content closer to users", isCorrect: true },
        { text: "Replacing all databases", isCorrect: false },
        { text: "Eliminating the need for APIs", isCorrect: false },
        { text: "Running background jobs only", isCorrect: false },
      ],
      topic: "Performance",
    },
    {
      title: "Database Replication",
      description: "Read replicas are mainly used to:",
      difficulty: "medium",
      options: [
        { text: "Increase read throughput and reduce primary load", isCorrect: true },
        { text: "Delete stale cache keys", isCorrect: false },
        { text: "Replace message queues", isCorrect: false },
        { text: "Store frontend bundles", isCorrect: false },
      ],
      topic: "Databases",
    },
  ],
  general: [
    {
      title: "HTTP Status 404",
      description: "What does HTTP status code 404 indicate?",
      difficulty: "easy",
      options: [
        { text: "Server error", isCorrect: false },
        { text: "Resource not found", isCorrect: true },
        { text: "Unauthorized", isCorrect: false },
        { text: "Created successfully", isCorrect: false },
      ],
      topic: "Web",
    },
    {
      title: "SQL Primary Key",
      description: "A primary key in a relational table must be:",
      difficulty: "easy",
      options: [
        { text: "Nullable and duplicate-friendly", isCorrect: false },
        { text: "Unique and not null", isCorrect: true },
        { text: "Always an integer", isCorrect: false },
        { text: "Optional for every row", isCorrect: false },
      ],
      topic: "Databases",
    },
    {
      title: "Git Branch Purpose",
      description: "Why are branches used in Git?",
      difficulty: "easy",
      options: [
        { text: "To delete commit history", isCorrect: false },
        { text: "To isolate feature work from mainline", isCorrect: true },
        { text: "To encrypt repositories", isCorrect: false },
        { text: "To disable merges", isCorrect: false },
      ],
      topic: "Version Control",
    },
    {
      title: "REST PUT vs POST",
      description: "PUT is typically used to:",
      difficulty: "medium",
      options: [
        { text: "Create a resource at an unknown URL", isCorrect: false },
        { text: "Replace or update a resource at a known URL", isCorrect: true },
        { text: "Delete all resources", isCorrect: false },
        { text: "Fetch paginated lists only", isCorrect: false },
      ],
      topic: "APIs",
    },
    {
      title: "Big-O of Nested Loops",
      description: "Two nested loops over n items each usually run in:",
      difficulty: "medium",
      options: [
        { text: "O(n)", isCorrect: false },
        { text: "O(n²)", isCorrect: true },
        { text: "O(log n)", isCorrect: false },
        { text: "O(1)", isCorrect: false },
      ],
      topic: "Complexity",
    },
  ],
};

export const SAMPLE_BANK_DEFINITIONS = [
  {
    name: "DSA Screening Pack",
    category: "backend",
    description: "MCQs on algorithms and data structures, followed by coding problems from the DSA arena.",
    tags: ["dsa", "screening", "sample"],
    mcqPack: "dsa",
    codingSource: "dsa",
    codingLimit: 3,
  },
  {
    name: "Linux Ops Screening",
    category: "devops",
    description: "Shell and Linux fundamentals MCQs, followed by hands-on bash challenges.",
    tags: ["linux", "devops", "sample"],
    mcqPack: "linux",
    codingSource: "linux",
    codingLimit: 3,
  },
  {
    name: "Full-Stack Fundamentals",
    category: "mcq",
    description: "General engineering MCQs with a short DSA coding section at the end.",
    tags: ["general", "screening", "sample"],
    mcqPack: "general",
    codingSource: "dsa",
    codingLimit: 2,
  },
  {
    name: "System Design Screening",
    category: "system_design",
    description: "Architecture MCQs followed by system design scenarios from the Enum platform.",
    tags: ["system_design", "screening", "sample"],
    mcqPack: "system_design",
    codingSource: "system_design",
    codingLimit: 2,
  },
];

export function mapMcqToBankPayload(mcq) {
  const correctTexts = mcq.options.filter((o) => o.isCorrect).map((o) => o.text);
  return {
    type: "mcq",
    title: mcq.title,
    description: mcq.description,
    difficulty: mcq.difficulty,
    options: mcq.options,
    correctAnswer: correctTexts,
    codeTemplate: null,
    testCases: [],
    points: mcq.difficulty === "hard" ? 8 : mcq.difficulty === "medium" ? 6 : 5,
    tags: ["sample", "mcq"],
    technology: "",
    topic: mcq.topic || "General",
  };
}
