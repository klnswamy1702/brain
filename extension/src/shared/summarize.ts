import { GoogleGenAI } from "@google/genai";
import type { TabInfo } from "./types";

export async function summarizeTabs(tabs: TabInfo[], apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("No API key provided");
  }
  
  if (!tabs || tabs.length === 0) {
    return "No tabs to summarize.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const tabsContext = tabs
    .map((t) => `- [${t.title}](${t.url})`)
    .join("\n");

  const prompt = `
I have been researching and have the following tabs open:

${tabsContext}

Please provide a concise, insightful summary of what I was researching based on these tab titles and URLs. Group them by topic if it makes sense. Keep it under 3 paragraphs.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
    });
    return response.text || "Failed to generate summary.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
