import prisma from "../db/index.js";
import { runJavaJudge } from "../utils/judgeEngine/javaJudge.js";
import { runCppJudge } from "../utils/judgeEngine/cppJudge.js";
import { runCJudge } from "../utils/judgeEngine/cJudge.js";
import { runPythonJudge } from "../utils/judgeEngine/pythonJudge.js";

export const judgeCode = async (req, res) => {
    const { questionId, language, userCode, mode } = req.body;

    const question = await prisma.question.findUnique({
        where: { id: questionId },
    });

    if (!question)
        return res.status(404).json({ message: "Question not found" });

    let testcases = (question.testcases || []).map(tc => {
        let input = tc.input;
        let expectedOutput = tc.expectedOutput || tc.output || "";

        if (typeof input === "string") {
            input = input.split("\n").filter(s => s.trim() !== "");
        }

        if (!Array.isArray(input)) {
            input = [String(input)];
        }

        return { input, expectedOutput: String(expectedOutput).trim() };
    });

    if (mode === "run") {
        testcases = testcases.slice(0, 3);
    }

    let results;

    try {
        const judgeArgs = {
            userCode,
            functionName: question.functionName,
            parameterTypes: question.parameterTypes,
            returnType: question.returnType,
            testcases
        };

        if (language === "java") {
            results = await runJavaJudge(judgeArgs);
        } else if (language === "cpp") {
            results = await runCppJudge(judgeArgs);
        } else if (language === "c") {
            results = await runCJudge(judgeArgs);
        } else if (language === "python") {
            results = await runPythonJudge(judgeArgs);
        } else {
            return res.status(400).json({ message: "Unsupported language" });
        }

        const passed = results.filter(r => r.passed).length;
        const hasErrors = results.some(r => r.error);

        return res.json({
            results,
            allPassed: results.length > 0 && results.every(r => r.passed),
            passedCount: passed,
            totalCount: results.length,
            ...(hasErrors && { hasErrors: true })
        });
    } catch (err) {
        return res.status(500).json({ message: String(err) });
    }
};
