import type { LinuxQuestion } from "@/components/linux/QuestionPanel";

export const linuxQuestionsFallback: LinuxQuestion[] = [
  {
    id: "linux-print-current-directory",
    slug: "print-current-directory",
    title: "Print Current Directory",
    description:
      "Write a Bash command that prints the current working directory.",
    difficulty: "easy",
    examples: [
      {
        input: "Run a command that prints the working directory.",
        output: "/app",
        explanation:
          "The sandbox starts in /app, so pwd should print that path.",
      },
    ],
    starterCode: "#!/usr/bin/env bash\n# Print the current directory\n",
    expectedOutput: "/app",
    constraints: [
      "Use a single Bash command.",
      "Do not hardcode the answer as plain text.",
    ],
    hints: ["The pwd command prints the current directory."],
    language: "bash",
  },
  {
    id: "linux-list-hidden-files",
    slug: "list-hidden-files",
    title: "List Hidden Files",
    description:
      "Write a Bash command that lists all files in the current directory, including hidden entries, one per line.",
    difficulty: "easy",
    examples: [
      {
        input: "Run a command that reveals dotfiles as well.",
        output: ".arena-secret\ncode.sh",
        explanation:
          "The sandbox includes a hidden marker file and the script itself.",
      },
    ],
    starterCode:
      "#!/usr/bin/env bash\n# List all files, including hidden ones\n",
    expectedOutput: ".arena-secret\ncode.sh",
    constraints: ["Output one filename per line.", "Include hidden files."],
    hints: ["ls -1A is a compact way to show hidden files one per line."],
    language: "bash",
  },
  {
    id: "linux-create-app-file",
    slug: "create-app-file",
    title: "Create App File",
    description:
      "Write a Bash command that creates an empty file named app.txt.",
    difficulty: "easy",
    examples: [
      {
        input: "Create a new empty file called app.txt.",
        output: "",
        explanation: "touch creates the file without printing anything.",
      },
    ],
    starterCode: "#!/usr/bin/env bash\n# Create app.txt\n",
    expectedOutput: "",
    constraints: ["Do not print anything.", "The file must be named app.txt."],
    hints: ["touch app.txt creates an empty file."],
    language: "bash",
  },
  {
    id: "linux-echo-hello-enum",
    slug: "echo-hello-enum",
    title: "Echo Hello Enum",
    description:
      "Write a Bash command that prints Hello Enum to standard output.",
    difficulty: "easy",
    examples: [
      {
        input: "Print the exact text Hello Enum.",
        output: "Hello Enum",
        explanation: "Use echo or printf to print the text.",
      },
    ],
    starterCode: "#!/usr/bin/env bash\n# Print Hello Enum\n",
    expectedOutput: "Hello Enum",
    constraints: ["Print the text exactly.", "Avoid extra characters."],
    hints: ["echo Hello Enum is enough here."],
    language: "bash",
  },
  {
    id: "linux-run-node-script",
    slug: "run-node-script",
    title: "Run a Node Script",
    description:
      "Write a Bash command that creates a JavaScript file printing 20 and then runs it with Node.js.",
    difficulty: "medium",
    examples: [
      {
        input: "Create app.js, write console.log(10 + 10), and execute it.",
        output: "20",
        explanation: "The script should print the sum of 10 and 10.",
      },
    ],
    starterCode: "#!/usr/bin/env bash\n# Create and run the script\n",
    expectedOutput: "20",
    constraints: ["Use Bash to create the file.", "Use Node.js to execute it."],
    hints: ["You can combine echo and node in one command sequence."],
    language: "bash",
  },
];
