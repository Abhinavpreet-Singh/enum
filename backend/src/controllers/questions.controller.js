import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { generateAllTemplates } from "../utils/judgeEngine/templateGenerator.js";

const getQuestion = asyncHandler(async (req, res) => {
  const allData = await prisma.question.findMany();
  const userId = req.user?.id;

  // Fetch user's submissions if authenticated
  let userSubmissions = {};
  if (userId) {
    const submissions = await prisma.submission.findMany({
      where: { userId },
      select: {
        questionId: true,
        verdict: true,
      },
      orderBy: { createdAt: "desc" },
    });

    submissions.forEach((sub) => {
      if (!userSubmissions[sub.questionId]) {
        userSubmissions[sub.questionId] = {
          attempted: true,
          solved: sub.verdict === "accepted",
          attempts: 1,
        };
      } else {
        userSubmissions[sub.questionId].attempts += 1;
        if (sub.verdict === "accepted") {
          userSubmissions[sub.questionId].solved = true;
        }
      }
    });
  }

  const enrichedData = allData.map((q) => {
    const questionObj = { ...q };

    if (
      questionObj.functionName &&
      questionObj.parameterTypes &&
      questionObj.returnType
    ) {
      const autoTemplates = generateAllTemplates({
        functionName: questionObj.functionName,
        parameterNames: questionObj.parameterNames || [],
        parameterTypes: questionObj.parameterTypes,
        returnType: questionObj.returnType,
      });

      if (!questionObj.initialCode || questionObj.initialCode.length === 0) {
        questionObj.initialCode = [
          { python: autoTemplates.python },
          { java: autoTemplates.java },
          { c: autoTemplates.c },
          { cpp: autoTemplates.cpp },
        ];
      }
    }

    // Add user progress status
    if (userId && userSubmissions[q.id]) {
      questionObj.status = userSubmissions[q.id];
    } else {
      questionObj.status = { attempted: false, solved: false, attempts: 0 };
    }

    return questionObj;
  });

  return res.status(200).json({
    message: "Questions fetched!!",
    data: enrichedData,
  });
});

export { getQuestion };
