"use client";

import { Question } from "@/data/dsa-questions";
import { Clock, AlertCircle } from "lucide-react";

interface QuestionDetailProps {
    question: Question;
}

const difficultyColors = {
    Easy: "text-green-600 bg-green-50",
    Medium: "text-yellow-600 bg-yellow-50",
    Hard: "text-red-600 bg-red-50",
};

export default function QuestionDetail({ question }: QuestionDetailProps) {
    return (
        <div className="h-full overflow-auto bg-white dark-scrollbar">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                    <h1 className="text-2xl font-bold text-black">{question.title}</h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className={`px-3 py-1 rounded text-xs font-mono tracking-wide ${difficultyColors[question.difficulty]
                            }`}
                    >
                        {question.difficulty}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono tracking-wide">
                        {question.category}
                    </span>
                    <div className="ml-auto flex items-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono text-xs">15 mins</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                {/* Description */}
                <div>
                    <h2 className="font-mono text-xs tracking-[0.2em] text-gray-500 mb-3">
                        DESCRIPTION
                    </h2>
                    <p className="text-sm text-gray-700 leading-relaxed">
                        {question.description}
                    </p>
                </div>

                {/* Examples */}
                <div>
                    <h2 className="font-mono text-xs tracking-[0.2em] text-gray-500 mb-3">
                        EXAMPLES
                    </h2>
                    <div className="space-y-4">
                        {question.examples.map((example, idx) => (
                            <div
                                key={idx}
                                className="border border-gray-300 rounded-lg p-4 bg-gray-50"
                            >
                                <p className="font-mono text-xs text-gray-600 mb-2">
                                    <span className="font-bold">Input:</span> {example.input}
                                </p>
                                <p className="font-mono text-xs text-gray-600 mb-2">
                                    <span className="font-bold">Output:</span> {example.output}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Constraints */}
                <div>
                    <h2 className="font-mono text-xs tracking-[0.2em] text-gray-500 mb-3">
                        CONSTRAINTS
                    </h2>
                    <ul className="space-y-2">
                        {question.constraints.map((constraint, idx) => (
                            <li
                                key={idx}
                                className="flex items-start gap-2 text-sm text-gray-700"
                            >
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span>{constraint}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-mono text-xs text-blue-900 font-bold mb-1">
                                TIP
                            </p>
                            <p className="text-sm text-blue-700">
                                Try to solve the problem first without looking at the solution.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
