import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_PROMPT } from '../constants.ts';

declare global {
    interface Window {
        marked: {
            parse(markdownString: string, options?: any): string;
        };
    }
}

let ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
    if (!ai) {
        if (!process.env.API_KEY) {
            console.error("API_KEY environment variable not set.");
            throw new Error("API_KEY is not configured.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

export const createChatSession = (): Chat => {
    const genAI = getAI();
    return genAI.chats.create({
        model: 'gemini-2.5-flash-preview-04-17',
        config: {
            systemInstruction: SYSTEM_PROMPT,
        }
    });
};

export const parseMarkdown = (text: string): string => {
    if (window.marked) {
        return window.marked.parse(text, { gfm: true, breaks: true });
    }
    // Basic fallback if marked.js fails to load
    return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};