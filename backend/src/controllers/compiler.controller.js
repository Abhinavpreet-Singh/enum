import { executeCompilerCode } from "../services/compilerService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const runCompiler = asyncHandler(async (req, res) => {
  const { language, code } = req.body;
  const result = await executeCompilerCode({ language, code });

  return res.status(200).json(result);
});

