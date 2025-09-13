// src/main/gemini-service.ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const prompts: Record<string, string> = {
  summarize: "Summarize the following text in 5 concise bullet points:",
  rewrite: "Rewrite the following text to be clearer and more concise:",
  outline: "Create a concise outline from the following text:",
  todos: "Extract actionable TODO items from the following text:",
};

export async function runGeminiTask(mode: string, input: string) {
  const system = prompts[mode] ?? "Respond helpfully to:";
  const res = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${system}\n\n${input}`,
  });
   return res.text as string;
}
