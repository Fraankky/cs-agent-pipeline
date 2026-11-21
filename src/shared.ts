import { generateCompletion, type ZodSchema } from "@anvia/core";
import { OpenAIClient } from "@anvia/openai";

const baseUrl = Bun.env.OPENAI_BASE_URL;
const apiKey = Bun.env.OPENAI_API_KEY;

if (!baseUrl || !apiKey) {
  throw new Error("Base url and api key are empty")
}

const client = new OpenAIClient({
  baseUrl, apiKey
})
const model = client.completionModel({modelId: "gpt-5.6-luna", api: "chat"})

export function askAi(prompt: string) {
  return generateCompletion({
    model,
    instructions: "You are a helpfull assitant",
    prompt
  })
}

export function askAiJson(
  prompt: string,
  outputSchema: ZodSchema,
  instructions?: string
) {
  return generateCompletion({
    model,
    instructions: instructions ||"You are a helpfull assitant",
    prompt,
    outputSchema,
  })
}
