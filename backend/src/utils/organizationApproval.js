import { ApiError } from "./apiError.js";

export function assertOrganizationApproved(organization) {
  if (organization.approvalStatus === "pending") {
    throw new ApiError(
      403,
      "Your organization registration is pending admin approval. You will be able to log in once an admin approves your account.",
    );
  }

  if (organization.approvalStatus === "rejected") {
    throw new ApiError(
      403,
      "Your organization registration was rejected. Please contact support if you believe this is an error.",
    );
  }
}
