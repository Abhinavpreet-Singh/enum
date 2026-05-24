import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

const publishSolution = asyncHandler(async (req, res) => {
    const { questionId, code, language } = req.body;

    if (!questionId) {
        throw new ApiError(400, "Question ID is required!!");
    }

    if (!code || code.trim() === "") {
        throw new ApiError(400, "Code is required to publish solution!!");
    }

    if (!language) {
        throw new ApiError(400, "Language is required!!");
    }

    const findQuestion = await prisma.question.findUnique({
        where: { id: questionId },
    });

    if (!findQuestion) {
        throw new ApiError(404, "Question not found!!");
    }

    const solution = await prisma.solution.create({
        data: {
            questionId,
            userId: req.user.id,
            code,
            language,
        },
    });

    return res
        .status(201)
        .json({
            message: "Solution published successfully!!",
            data: solution
        });
});

const getSolutionsByQuestion = asyncHandler(async (req, res) => {
    const { questionId } = req.params;

    if (!questionId) {
        throw new ApiError(400, "Question ID is required!!");
    }

    const solutions = await prisma.solution.findMany({
        where: { questionId },
        include: {
            user: { select: { username: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return res
        .status(200)
        .json({
            message: "Solutions fetched successfully!!",
            data: solutions
        });
});

const getMySolutions = asyncHandler(async (req, res) => {
    const solutions = await prisma.solution.findMany({
        where: { userId: req.user.id },
        include: {
            question: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return res
        .status(200)
        .json({
            message: "Your solutions fetched successfully!!",
            data: solutions
        });
});

const upvoteSolution = asyncHandler(async (req, res) => {
    const { solutionId } = req.params;

    if (!solutionId) {
        throw new ApiError(400, "Solution ID is required!!");
    }

    const solution = await prisma.solution.update({
        where: { id: solutionId },
        data: { upvotes: { increment: 1 } },
    }).catch(() => null);

    if (!solution) {
        throw new ApiError(404, "Solution not found!!");
    }

    return res
        .status(200)
        .json({
            message: "Solution upvoted successfully!!",
            data: solution
        });
});

export {
    publishSolution,
    getSolutionsByQuestion,
    getMySolutions,
    upvoteSolution
};
