import { AiIcon, SendIcon, UserIcon } from './components/Icons.tsx';
import { Message, MessageAuthor } from './types.ts';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { parseMarkdown, sendMessageToGeminiStream } from './services/geminiService.ts';

import logoDark from './image/logo-mindx-dark.png'
import logoLight from './image/logo-mindx-light.png'

const suggestionRegex = /\[([^\]]+)\]/g;

// Component to display a single chat message
interface ChatBubbleProps {
  message: Message;
}
const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.author === MessageAuthor.USER;
  const isSystem = message.author === MessageAuthor.SYSTEM;
  
  const [parsedContentHtml, setParsedContentHtml] = useState('');

  useEffect(() => {
    parseMarkdown(message.content).then(html => {
        setParsedContentHtml(html);
    });
  }, [message.content]);


  if (isSystem) {
    return (
      <div className="text-center my-4 text-xs text-gray-500 dark:text-gray-400 italic">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-4 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <AiIcon />}
      <div
        className={`max-w-xl rounded-2xl p-4 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-bl-none chat-bubble-ai'
        }`}
        dangerouslySetInnerHTML={{ __html: parsedContentHtml }}
      />
      {isUser && <UserIcon />}
    </div>
  );
};

// Component to display suggested actions
interface SuggestedActionsProps {
  suggestions: string[];
  onClick: (suggestion: string) => void;
}
const SuggestedActions: React.FC<SuggestedActionsProps> = ({ suggestions, onClick }) => {
  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {suggestions.map((text, index) => (
        <button
          key={index}
          onClick={() => onClick(text)}
          className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white rounded-full transition-colors"
        >
          {text}
        </button>
      ))}
    </div>
  );
};

// Main App Component
export default function App(): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const initializeChat = useCallback(() => {
    setIsLoading(true);
    
    const initialGreeting = `Chào bạn! Tôi là Trợ lý AI của MindX, được thiết kế để giúp bạn tìm hiểu về các lộ trình học công nghệ cho lứa tuổi K12.

Bạn có thể hỏi tôi về:
*   **Thông tin các khóa học** trong 3 lộ trình chính.
*   **So sánh chi tiết** giữa các khóa học để dễ dàng lựa chọn.
*   **Nội dung cụ thể** của từng buổi học.

Để bắt đầu, bạn quan tâm đến lộ trình nào nhất?
[Lộ trình Coding & AI] [Lộ trình Robotics] [Lộ trình Art & Design]`;
    
    setMessages([
        {
          id: `ai-initial-${Date.now()}`,
          author: MessageAuthor.AI,
          content: initialGreeting,
        },
      ]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      author: MessageAuthor.USER,
      content: messageText,
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages;
      const result = await sendMessageToGeminiStream(history, messageText);
      
      let responseText = '';
      const aiMessageId = `ai-${Date.now()}`;
      
      setMessages(prev => [...prev, { id: aiMessageId, author: MessageAuthor.AI, content: '' }]);

      for await (const chunk of result) {
        responseText += chunk.text;
        setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, content: responseText } : m));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessage = "Xin lỗi, đã có chút sự cố. Bạn có thể thử lại được không?";
      
      const errorString = String(error);
      if (errorString.includes("429") || errorString.includes("RESOURCE_EXHAUSTED")) {
        errorMessage = "Rất tiếc, ứng dụng đã tạm thời vượt quá hạn mức truy cập API của Google Gemini. Điều này thường xảy ra với các khoá API dùng thử hoặc miễn phí. Vui lòng kiểm tra lại gói cước và thông tin thanh toán trên tài khoản Google AI của bạn để tiếp tục sử dụng.";
      }

      setMessages(prev => [...prev, { id: `err-${Date.now()}`, author: MessageAuthor.SYSTEM, content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const lastAiMessage = messages.slice().reverse().find(m => m.author === MessageAuthor.AI);
  const suggestions = lastAiMessage?.content.match(suggestionRegex)?.map(s => s.slice(1, -1)) || [];
  
  return (
    <div className="bg-white dark:bg-[#313131] text-gray-900 dark:text-white h-screen flex flex-col">
      <header className="bg-gray-100/80 dark:bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 shadow-md">
        <div className="flex-shrink-0">
          <img src={logoDark} alt="MindX Logo" className="h-10 block dark:hidden" />
          <img src={logoLight} alt="MindX Logo" className="h-10 hidden dark:block" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Trợ lý Tư vấn Lộ trình học K12</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Được hỗ trợ bởi AI từ MindX</p>
        </div>
      </header>

      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={{...msg, content: msg.content.replace(suggestionRegex, '').trim()}} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-4 my-4">
                <AiIcon />
                <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl p-4 rounded-bl-none">
                   <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-gray-100/80 dark:bg-gray-800/50 backdrop-blur-sm p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
          {!isLoading && <SuggestedActions suggestions={suggestions} onClick={handleSendMessage} />}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn ở đây..."
              className="flex-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full py-3 px-5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--mindx-red)]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[var(--mindx-red)] text-white rounded-full p-3 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-90 transition-all"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}