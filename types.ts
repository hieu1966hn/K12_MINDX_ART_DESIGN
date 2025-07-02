export enum MessageAuthor {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system', // For initial prompts or errors
}

export interface Message {
  id: string;
  author: MessageAuthor;
  content: string;
}
