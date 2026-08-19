import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import {
  buildQuestionNestedCreate,
  questionInclude,
  replaceQuestionInitialCodes,
  replaceQuestionTestCases,
  serializeQuestion,
} from "../utils/prismaNormalizers.js";

const getAdminPrivilege = asyncHandler(async (req, res) => {
    const adminEmails = [
        "prathamv0106@gmail.com",
        "damanpreetk5162@gmail.com"
        // "aroraabhinavpreet@gmail.com",
    ];

    return res
        .status(200)
        .json({
            message: "Admin emails fetched!!",
            data: { "email": adminEmails }
        });
});

const adminPostQuestion = asyncHandler(async (req, res) => {
    const { title, desc, level, testcases, constraints, topic, initialCode, functionName, parameterNames, parameterTypes, returnType, isFree } = req.body;

    if (
        !title?.trim() ||
        !desc?.trim() ||
        !level?.trim() ||
        !constraints?.trim() ||
        !Array.isArray(testcases) ||
        testcases.length === 0 ||
        !topic ||
        !functionName?.trim() ||
        !Array.isArray(parameterTypes) ||
        parameterTypes.length === 0 ||
        !returnType?.trim()
    ) {
        throw new ApiError(400, "All fields are required (including functionName, parameterTypes, returnType)");
    }

    const questionExists = await prisma.question.findFirst({
        where: { title, desc },
    });

    if (questionExists) {
        throw new ApiError(409, "Question already exists!!");
    }

    const createQuestion = await prisma.question.create({
        data: {
            title,
            desc,
            level,
            constraints,
            topic,
            functionName,
            parameterNames: parameterNames || [],
            parameterTypes,
            returnType,
            isFree: typeof isFree === "boolean" ? isFree : null,
            ...buildQuestionNestedCreate({ testcases, initialCode }),
        },
        include: questionInclude,
    });

    return res
        .status(201)
        .json({
            message: "Question created",
            data: serializeQuestion(createQuestion, { includeHidden: true })
        });
});

const adminEditQuestion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, desc, level, testcases, constraints, topic, initialCode, functionName, parameterNames, parameterTypes, returnType } = req.body;

    if (!id) {
        throw new ApiError(400, "Question ID is required");
    }

    const question = await prisma.question.findUnique({ where: { id } });

    if (!question) {
        throw new ApiError(404, "Question not found");
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (desc !== undefined) updateData.desc = desc;
    if (level !== undefined) updateData.level = level;
    if (constraints !== undefined) updateData.constraints = constraints;
    if (topic !== undefined) updateData.topic = topic;
    if (functionName !== undefined) updateData.functionName = functionName;
    if (parameterNames !== undefined) updateData.parameterNames = parameterNames;
    if (parameterTypes !== undefined) updateData.parameterTypes = parameterTypes;
    if (returnType !== undefined) updateData.returnType = returnType;

    const updatedQuestion = await prisma.$transaction(async (tx) => {
        if (testcases !== undefined) {
            await replaceQuestionTestCases(tx, id, testcases);
        }
        if (initialCode !== undefined) {
            await replaceQuestionInitialCodes(tx, id, initialCode);
        }

        return tx.question.update({
            where: { id },
            data: updateData,
            include: questionInclude,
        });
    });

    return res.status(200).json({
        message: "Question updated successfully",
        data: serializeQuestion(updatedQuestion, { includeHidden: true })
    });
});

async function deleteQuestionRelations(tx, questionIds) {
    if (!questionIds.length) return;
    await tx.submission.deleteMany({ where: { questionId: { in: questionIds } } });
    await tx.solution.deleteMany({ where: { questionId: { in: questionIds } } });
    await tx.editorial.deleteMany({ where: { questionId: { in: questionIds } } });
    await tx.questionCompetition.deleteMany({ where: { questionId: { in: questionIds } } });
}

const adminDeleteQuestion = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Question ID is required");
    }

    const deletedQuestion = await prisma.$transaction(async (tx) => {
        const existing = await tx.question.findUnique({ where: { id } });
        if (!existing) return null;
        await deleteQuestionRelations(tx, [id]);
        return tx.question.delete({ where: { id } });
    });

    if (!deletedQuestion) {
        throw new ApiError(404, "Question not found");
    }

    return res.status(200).json({
        message: "Question deleted successfully",
        data: deletedQuestion
    });
});

const adminDeleteAllDsaQuestions = asyncHandler(async (_req, res) => {
    const result = await prisma.$transaction(async (tx) => {
        const questions = await tx.question.findMany({ select: { id: true } });
        const ids = questions.map((q) => q.id);
        await deleteQuestionRelations(tx, ids);
        const deleted = await tx.question.deleteMany({});
        return { count: deleted.count };
    });

    return res.status(200).json({
        message: result.count
            ? `Deleted ${result.count} DSA Arena question(s)`
            : "No DSA Arena questions to delete",
        data: result,
    });
});

const getAdminDsaQuestions = asyncHandler(async (_req, res) => {
    const allData = await prisma.question.findMany({ include: questionInclude });
    return res.status(200).json({
        message: "Questions fetched!!",
        data: allData.map((q) => serializeQuestion(q, { includeHidden: true })),
    });
});

export {
    adminPostQuestion,
    getAdminPrivilege,
    adminEditQuestion,
    adminDeleteQuestion,
    adminDeleteAllDsaQuestions,
    getAdminDsaQuestions,
};
