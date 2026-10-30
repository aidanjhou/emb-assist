'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { MagicWandIcon } from '@/components/MagicWandIcon';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  // 自适应输入框高度
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: String(Date.now()), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 模拟回复 (后续将替换为 DeepSeek 流式请求)
    setTimeout(() => {
      const replyMsg: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: `你好！我已收到你的问题：“${text}”。后续我们将在此接入真实的 API 流式输出。`,
      };
      setMessages((prev) => [...prev, replyMsg]);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      {/* 主体交互区域 */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden w-full">
        {!hasMessages ? (
          /* 初始居中状态：魔棒与问候语 + 大圆角输入卡片 */
          <div className="flex w-full max-w-[740px] flex-col items-center justify-center px-5 -mt-10">
            <div className="mb-6 flex items-center justify-center gap-3 text-center">
              <MagicWandIcon size={32} />
              <h1 className="m-0 text-[22px] font-semibold tracking-tight text-gray-900">
                你好，有什么我能帮你的吗？
              </h1>
            </div>

            {/* 极简大圆角输入卡片 */}
            <div className="w-full max-w-[740px] rounded-[22px] border border-gray-200 bg-white p-[16px_18px_12px_18px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all focus-within:border-gray-300">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="给智能助手发送消息..."
                rows={2}
                className="w-full resize-none border-none bg-transparent p-0 text-[15px] leading-relaxed text-gray-900 outline-none placeholder:text-gray-400"
              />

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    input.trim()
                      ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-default'
                  }`}
                  title="发送"
                >
                  <ArrowUp size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 对话进行中状态：消息流 + 底部输入卡片 */
          <div className="flex h-full w-full max-w-[740px] flex-col px-5">
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex w-full items-start gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="mt-0.5 shrink-0">
                      <MagicWandIcon size={24} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] text-[15px] leading-relaxed text-gray-900 break-words ${
                      msg.role === 'user'
                        ? 'rounded-xl bg-gray-100 px-3.5 py-2.5'
                        : 'px-1 py-1'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* 底部悬浮输入卡片 */}
            <div className="w-full bg-white pb-6 pt-3">
              <div className="w-full rounded-[22px] border border-gray-200 bg-white p-[16px_18px_12px_18px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all focus-within:border-gray-300">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="给智能助手发送消息..."
                  rows={1}
                  className="w-full resize-none border-none bg-transparent p-0 text-[15px] leading-relaxed text-gray-900 outline-none placeholder:text-gray-400"
                />

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      input.trim()
                        ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-default'
                    }`}
                    title="发送"
                  >
                    <ArrowUp size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
