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
    const { title, desc, level, testcases, constraints, topic, initialCode, functionName, parameterNames, parameterTypes, returnType } = req.body;

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
            ...buildQuestionNestedCreate({ testcases, initialCode }),
        },
        include: questionInclude,
    });

    return res
        .status(201)
        .json({
            message: "Question created",
            data: serializeQuestion(createQuestion)
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
        data: serializeQuestion(updatedQuestion)
    });
});

const adminDeleteQuestion = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Question ID is required");
    }

    const deletedQuestion = await prisma.question.delete({
        where: { id },
    }).catch(() => null);

    if (!deletedQuestion) {
        throw new ApiError(404, "Question not found");
    }

    return res.status(200).json({
        message: "Question deleted successfully",
        data: deletedQuestion
    });
});

export {
    adminPostQuestion,
    getAdminPrivilege,
    adminEditQuestion,
    adminDeleteQuestion
};
