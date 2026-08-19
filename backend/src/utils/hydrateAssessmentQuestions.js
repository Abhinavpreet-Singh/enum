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

  // Fetch every referenced bank question in one query. Doing it per row turned a
  // 40-question exam into 41 queries fired concurrently, which alone could
  // exhaust the connection pool while candidates were starting their exam.
  const bankQuestionIds = [
    ...new Set(
      rows
        .filter((aq) => aq.questionType === "bank" && aq.bankQuestionId)
        .map((aq) => aq.bankQuestionId),
    ),
  ];

  const bankQuestions = bankQuestionIds.length
    ? await prisma.bankQuestion.findMany({
        where: { id: { in: bankQuestionIds } },
        include: bankQuestionInclude,
      })
    : [];

  const bankQuestionById = new Map(bankQuestions.map((bq) => [bq.id, bq]));

  return rows.map((aq) => {
      if (aq.questionType === "bank" && aq.bankQuestionId) {
        const bq = bankQuestionById.get(aq.bankQuestionId);
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
            bankQuestionId: bq.id,
            testCases: (serialized.testCases || [])
              .filter((tc) => !tc.isHidden)
              .map((tc) => ({
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
  });
}
