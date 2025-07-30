import { logClient, logServer, AppLogError } from "@/lib/log";
import { GenerativeModel, Schema } from "@firebase/ai";
import type { GeminiAIErrorHook } from "./ai";

// Checks if a model is supported
export const isSupportedModel = (
  modelName: string,
  supportedModels: readonly string[]
): boolean => supportedModels.includes(modelName);

// Handles error logging and error hook, returns GeminiAIResult<never>
export const handleGeminiError = (
  error: AppLogError,
  errorHook: GeminiAIErrorHook
) => {
  logClient(error);
  logServer(error);
  errorHook(error);
  return { ok: false, error: error.message, code: error.code, details: error.details };
};

// Validates that a schema is present (can be extended for more checks)
export const validateSchema = (schema: Schema | undefined): boolean => {
  return !!schema;
};

// Calls the Gemini model and parses the response, returns T or Error
export const callGeminiModelAndParse = async <T>(
  model: GenerativeModel,
  prompt: string,
  errorHook: GeminiAIErrorHook
): Promise<T | Error> => {
  try {
    const result = await model.generateContent(prompt);
    let data: T | undefined;
    if (typeof result.response.text === "function") {
      const text = await result.response.text();
      data = JSON.parse(text);
    } else {
      data = JSON.parse(result.response.text);
    }
    if (typeof data === "undefined" || data === null) {
      return new Error("Parsed data is undefined or null");
    }
    return data;
  } catch (err) {
    const errorMessage =
      typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message
        : "Failed to parse Gemini model response";
    errorHook({
      type: "error",
      message: errorMessage,
      code: 500,
      details: { err },
    });
    return new Error(errorMessage);
  }
}; 