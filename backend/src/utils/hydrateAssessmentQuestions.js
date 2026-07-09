import prisma from "../db/index.js";
import {
  bankQuestionInclude,
  serializeBankQuestion,
} from "./prismaNormalizers.js";

/** Load assessment questions and strip correct answers for candidates. */
export async function hydrateAssessmentQuestions(assessmentId) {
  const rows = await prisma.assessmentQuestion.findMany({
    where: { assessmentId },
    orderBy: { order: "asc" },
  });

  return Promise.all(
    rows.map(async (aq) => {
      if (aq.questionType === "bank" && aq.bankQuestionId) {
        const bq = await prisma.bankQuestion.findUnique({
          where: { id: aq.bankQuestionId },
          include: bankQuestionInclude,
        });
        if (bq) {
          const serialized = serializeBankQuestion(bq);
          const safeOptions = Array.isArray(serialized.options)
            ? serialized.options.map(({ text, isCorrect: _isCorrect, ...rest }) => ({
                text,
                ...rest,
              }))
            : serialized.options;
          return {
            aqId: aq.id,
            order: aq.order,
            points: aq.points,
            required: aq.required,
            type: bq.type,
            title: bq.title,
            description: bq.description,
            difficulty: bq.difficulty,
            options: safeOptions,
            codeTemplate: bq.codeTemplate,
            testCases: (serialized.testCases || []).map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput ?? tc.output ?? "",
            })),
            tags: bq.tags,
            technology: bq.technology,
            topic: bq.topic,
            functionName: bq.functionName ?? null,
            parameterTypes: bq.parameterTypes ?? [],
            returnType: bq.returnType ?? null,
          };
        }
      }
      return {
        aqId: aq.id,
        order: aq.order,
        points: aq.points,
        required: aq.required,
        type: aq.questionType,
        simulationId: aq.simulationId,
      };
    }),
  );
}
