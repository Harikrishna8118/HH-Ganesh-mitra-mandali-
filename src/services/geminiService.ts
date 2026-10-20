import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger.ts';

/**
 * Retrieves the Gemini API Key strictly from environment variables.
 * Checks both server-side (process.env.GEMINI_API_KEY) and client-side (VITE_GEMINI_API_KEY).
 */
export function getGeminiApiKey(): string | null {
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  return null;
}

/**
 * Checks whether the Gemini API is configured in the environment.
 */
export function isGeminiConfigured(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && key.trim().length > 0 && key !== 'MY_GEMINI_API_KEY');
}

/**
 * Creates an authenticated GoogleGenAI client instance.
 * Throws a clean, informative error if the API key is not configured.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'Gemini API key is not configured. Please set GEMINI_API_KEY or VITE_GEMINI_API_KEY in your .env file.'
    );
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Helper to draft or refine a community festival announcement using Gemini 2.5 Flash.
 */
export async function generateAnnouncementDraft(prompt: string): Promise<string> {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are an assistant for Ganesh Mitra Mandali (H. Hosahalli), an Indian village festival committee. 
Help draft a polite, clear, and festive announcement based on the following request:

${prompt}

Provide a concise, festive headline and announcement message in English with Kannada cultural warmth.`,
            },
          ],
        },
      ],
    });

    return response.text || 'Unable to generate draft at this time.';
  } catch (error: unknown) {
    logger.captureAsyncError('GeminiService', error, 'Failed to generate announcement draft');
    if (error instanceof Error && error.message.includes('API key is not configured')) {
      throw error;
    }
    throw new Error('Could not connect to Gemini AI. Please check your network and API key.');
  }
}
