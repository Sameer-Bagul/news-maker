import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "" 
});

export interface HumanizedContent {
  tldr: string;
  bullets: string[];
  humanizedHtml: string;
  humanizedPlain: string;
  entities: {
    orgs: string[];
    persons: string[];
    places: string[];
  };
  confidence: number;
}

export interface FactCheck {
  claim: string;
  verified: boolean;
  confidence: number;
}

export async function humanizeArticle(
  title: string,
  rawText: string,
  sourceUrl: string
): Promise<HumanizedContent> {
  try {
    const systemPrompt = `You are a precise, neutral news editor. Only use the provided article text. Do not invent facts. If a fact is missing, say 'Not stated in article.' Preserve quoted text and attribute sources.

Output a JSON object with these fields:
- tldr: string (2 concise sentences summarizing the key points)
- bullets: string[] (4-8 factual bullet points)
- humanizedHtml: string (150-400 words, well-structured HTML with paragraphs)
- humanizedPlain: string (same content as plain text)
- entities: object with orgs[], persons[], places[] arrays
- confidence: number (0-100, your confidence in the accuracy)

Guidelines:
- Add context and interpretation without inventing facts
- Use natural, engaging language while preserving factual accuracy
- Include proper attribution and quotes
- Structure content for readability
- Extract named entities accurately`;

    const userPrompt = `Title: ${title}

Source URL: ${sourceUrl}

Article Text:
${rawText.slice(0, 12000)} ${rawText.length > 12000 ? '...[truncated]' : ''}

Please humanize this article following the guidelines above.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            tldr: { type: "string" },
            bullets: { 
              type: "array",
              items: { type: "string" }
            },
            humanizedHtml: { type: "string" },
            humanizedPlain: { type: "string" },
            entities: {
              type: "object",
              properties: {
                orgs: { type: "array", items: { type: "string" } },
                persons: { type: "array", items: { type: "string" } },
                places: { type: "array", items: { type: "string" } }
              },
              required: ["orgs", "persons", "places"]
            },
            confidence: { type: "number" }
          },
          required: ["tldr", "bullets", "humanizedHtml", "humanizedPlain", "entities", "confidence"]
        }
      },
      contents: userPrompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini API");
    }

    const result: HumanizedContent = JSON.parse(rawJson);
    
    // Validate required fields
    if (!result.tldr || !result.bullets || !result.humanizedHtml) {
      throw new Error("Invalid response structure from Gemini API");
    }

    return result;
  } catch (error) {
    console.error('Error humanizing article:', error);
    throw new Error(`Failed to humanize article: ${error}`);
  }
}

export async function performFactCheck(
  originalText: string,
  humanizedText: string
): Promise<FactCheck[]> {
  try {
    const systemPrompt = `You are a fact-checking expert. Compare the humanized text with the original article and identify any factual discrepancies.

Output a JSON array of fact-check objects with these fields:
- claim: string (the specific claim being checked)
- verified: boolean (true if the claim matches the original)
- confidence: number (0-100, confidence in the verification)

Focus on:
- Numbers, dates, and statistics
- Names of people and organizations
- Specific quotes and attributions
- Key facts and events`;

    const userPrompt = `Original Article:
${originalText.slice(0, 8000)}

Humanized Version:
${humanizedText.slice(0, 8000)}

Please fact-check the humanized version against the original.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              claim: { type: "string" },
              verified: { type: "boolean" },
              confidence: { type: "number" }
            },
            required: ["claim", "verified", "confidence"]
          }
        }
      },
      contents: userPrompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      return [];
    }

    return JSON.parse(rawJson) as FactCheck[];
  } catch (error) {
    console.error('Error performing fact check:', error);
    return [];
  }
}

export async function calculateSimilarity(
  originalText: string,
  humanizedText: string
): Promise<number> {
  try {
    const systemPrompt = `You are a text similarity analyzer. Compare the two texts and return a similarity score from 0-100.

0-30: Completely different content or meaning
31-60: Some similar themes but significantly different
61-80: Similar content with moderate rewording
81-95: Very similar with minor changes
96-100: Nearly identical text

Consider:
- Semantic meaning and key facts
- Structure and flow
- Specific details and examples
- Overall message and tone

Return only a JSON object with a "similarity" field containing the score.`;

    const userPrompt = `Original Text:
${originalText.slice(0, 6000)}

Humanized Text:
${humanizedText.slice(0, 6000)}

What is the similarity score?`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            similarity: { type: "number" }
          },
          required: ["similarity"]
        }
      },
      contents: userPrompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      return 50; // Default similarity score
    }

    const result = JSON.parse(rawJson);
    return Math.max(0, Math.min(100, result.similarity || 50));
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 50; // Default similarity score
  }
}
