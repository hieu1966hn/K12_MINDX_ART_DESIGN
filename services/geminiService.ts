import { GoogleGenAI, Chat } from "@google/genai";
import { marked } from 'marked';
import { Message, MessageAuthor } from '../types.ts';
import { SYSTEM_INSTRUCTIONS, KNOWLEDGE_BASE } from '../constants.ts';

// Initialize the Google Gemini client.
// API key is securely handled by an environment variable.
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY!,
});

// Function to send a message and receive a streaming response from Gemini
export const sendMessageToGeminiStream = async (history: Message[], newMessage: string) => {
  const model = 'gemini-2.5-flash-preview-04-17'; 

  // Format the history for the Gemini API
  const formattedHistory = history
    .filter(m => m.author !== MessageAuthor.SYSTEM)
    .map(m => ({
        role: m.author === MessageAuthor.USER ? 'user' : 'model',
        parts: [{ text: m.content.replace(/\[([^\]]+)\]/g, '').trim() }]
    }));

  // Create a chat instance with system instructions and history
  const chat: Chat = ai.chats.create({
    model,
    history: formattedHistory,
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS,
      temperature: 0.7,
      topP: 0.95,
    },
  });

  // Combine the knowledge base with the new user question
  const messageWithKnowledge = `${KNOWLEDGE_BASE}\n\nUser Question: ${newMessage}`;

  const stream = await chat.sendMessageStream({ message: messageWithKnowledge });

  // Return an async generator to stream response chunks to the UI
  async function* streamGenerator() {
    for await (const chunk of stream) {
      const chunkText = chunk.text;
      if (chunkText) {
        // Yield the same object structure as the previous implementation
        yield { text: chunkText };
      }
    }
  }

  return streamGenerator();
};

// Function to parse Markdown content to HTML remains unchanged
export const parseMarkdown = async (content: string): Promise<string> => {
    if (typeof marked === 'undefined') {
        console.error("Marked.js is not loaded.");
        return content; // Return plain content if marked is not available
    }
    // Use the marked library for conversion, with safe options
    // Await the result as it can be a promise, fixing the TS error
    return await marked.parse(content, { gfm: true, breaks: true });
};
