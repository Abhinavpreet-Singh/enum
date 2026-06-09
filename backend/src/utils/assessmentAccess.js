import { ApiError } from "./apiError.js";

/** Throws if the assessment is outside its active window or not published. */
export function assertAssessmentAccessible(assessment) {
  if (!assessment) throw new ApiError(404, "Assessment not found. Please check the test code.");
  if (assessment.status !== "published")
    throw new ApiError(403, "This assessment is not currently active.");

  const now = new Date();
  if (assessment.startDate && now < assessment.startDate)
    throw new ApiError(403, "Assessment has not started yet.");
  if (assessment.endDate && now > assessment.endDate)
    throw new ApiError(403, "Assessment has ended.");
}

/** Live window from publish time through duration (minutes). */
export function getPublishWindow(durationMinutes = 60) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  return { startDate, endDate };
}
