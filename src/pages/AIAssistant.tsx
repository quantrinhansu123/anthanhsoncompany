import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, X, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export function AIAssistant() {
  const { logoUrl } = useSettings();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp bạn với các câu hỏi về hệ thống, hướng dẫn sử dụng, hoặc bất kỳ thắc mắc nào khác. Bạn cần hỗ trợ gì?',
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateResponse(userMessage.text),
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 1000);
  };

  const generateResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('chào') || lowerInput.includes('hello') || lowerInput.includes('xin chào')) {
      return 'Xin chào! Rất vui được hỗ trợ bạn. Bạn có câu hỏi gì về hệ thống không?';
    }
    
    if (lowerInput.includes('chấm công') || lowerInput.includes('timekeeping')) {
      return 'Chấm công là tính năng trong mục Hành chính. Bạn có thể:\n- Xem lịch sử chấm công\n- Tạo phiếu chấm công mới\n- Xem tổng hợp chấm công\n\nBạn muốn tôi hướng dẫn chi tiết phần nào?';
    }
    
    if (lowerInput.includes('lương') || lowerInput.includes('salary')) {
      return 'Quản lý lương nằm trong mục Hành chính:\n- Thiết lập công lương\n- Bảng lương\n- Điểm cộng trừ\n\nBạn cần hỗ trợ về phần nào cụ thể?';
    }
    
    if (lowerInput.includes('nhân sự') || lowerInput.includes('hr') || lowerInput.includes('human resource')) {
      return 'Mục Nhân sự bao gồm:\n- Tuyển dụng\n- Hồ sơ nhân sự\n- KPI\n- Giao việc\n\nBạn muốn biết thêm về tính năng nào?';
    }
    
    if (lowerInput.includes('kpi') || lowerInput.includes('chấm điểm')) {
      return 'KPI (Key Performance Indicator) giúp đánh giá hiệu suất làm việc. Bạn có thể:\n- Xem danh sách KPI\n- Chấm điểm KPI\n- Xem báo cáo KPI\n\nBạn cần hỗ trợ gì về KPI?';
    }
    
    if (lowerInput.includes('cảm ơn') || lowerInput.includes('thanks') || lowerInput.includes('thank you')) {
      return 'Không có gì! Tôi luôn sẵn sàng hỗ trợ bạn. Nếu có thắc mắc gì khác, cứ hỏi tôi nhé! 😊';
    }
    
    return `Tôi hiểu bạn đang hỏi về "${userInput}". Để tôi có thể hỗ trợ tốt hơn, bạn có thể:\n\n1. Hỏi về các tính năng cụ thể như: chấm công, lương, nhân sự, KPI\n2. Yêu cầu hướng dẫn sử dụng\n3. Đặt câu hỏi về hệ thống\n\nBạn muốn biết thêm về điều gì?`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    'Hướng dẫn chấm công',
    'Cách xem bảng lương',
    'Quản lý nhân sự như thế nào?',
    'KPI là gì?'
  ];

  return (
    <div className="absolute inset-0 -m-3 sm:-m-4 md:-m-6 flex flex-col bg-slate-50 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] top-14 sm:top-16 relative">
      {/* Watermark Logo Background */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.15] md:opacity-[0.2]">
        <img
          src={logoUrl}
          alt="Watermark"
          className="w-[600px] h-[600px] md:w-[900px] md:h-[900px] lg:w-[1200px] lg:h-[1200px] object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-md border border-slate-200 p-1.5 overflow-hidden">
            <img
              src={logoUrl}
              alt="AI Assistant Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <Bot className="w-6 h-6 text-indigo-600 absolute opacity-0 pointer-events-none" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              Trợ lý AI
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
                <Sparkles className="w-3 h-3" />
                Online
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500">Hỏi tôi bất cứ điều gì về hệ thống</p>
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
        >
          {isMinimized ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4 relative z-10">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.sender === 'assistant' && (
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-slate-200 p-1">
                    <img
                      src={logoUrl}
                      alt="AI Assistant"
                      className="w-full h-full object-contain rounded-full"
                      onError={(e) => {
                        // Fallback to Bot icon
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent && !parent.querySelector('.fallback-icon')) {
                          const icon = document.createElement('div');
                          icon.className = 'fallback-icon';
                          icon.innerHTML = '<svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>';
                          parent.appendChild(icon);
                        }
                      }}
                    />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
                    message.sender === 'user'
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-800 border border-slate-200"
                  )}
                >
                  <div className="text-sm md:text-base whitespace-pre-line leading-relaxed">
                    {message.text}
                  </div>
                  <div
                    className={cn(
                      "text-xs mt-2",
                      message.sender === 'user' ? 'text-indigo-100' : 'text-slate-400'
                    )}
                  >
                    {message.timestamp.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {message.sender === 'user' && (
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-600">ND</span>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-slate-200 p-1">
                  <img
                    src={logoUrl}
                    alt="AI Assistant"
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent && !parent.querySelector('.fallback-icon')) {
                        const icon = document.createElement('div');
                        icon.className = 'fallback-icon';
                        icon.innerHTML = '<svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>';
                        parent.appendChild(icon);
                      }
                    }}
                  />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-4 md:px-6 pb-4">
              <p className="text-xs text-slate-500 mb-3">Câu hỏi gợi ý:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(question);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 text-xs md:text-sm bg-white border border-slate-200 rounded-full text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="bg-white border-t border-slate-200 px-4 md:px-6 py-4 sticky bottom-0 relative z-10">
            <div className="flex items-end gap-3 max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm md:text-base"
                  disabled={isLoading}
                />
                {input && (
                  <button
                    onClick={() => setInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                    aria-label="Xóa"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-3 rounded-xl transition-all duration-200 shrink-0",
                  input.trim() && !isLoading
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
                aria-label="Gửi tin nhắn"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Nhấn Enter để gửi • Shift + Enter để xuống dòng
            </p>
          </div>
        </>
      )}
    </div>
  );
}
