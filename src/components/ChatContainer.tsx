'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square, Key, Check } from 'lucide-react';
import { MagicWandIcon } from '@/components/MagicWandIcon';
import { fetchDeepSeekStream, ChatMessageParam } from '@/services/deepseek';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 初始化加载 API Key (优先环境变量，其次 localStorage)
  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '';
    const localKey = localStorage.getItem('deepseek_api_key') || '';
    setApiKey(localKey || envKey);
  }, []);

  const saveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('deepseek_api_key', newKey.trim());
  };

  // 自适应输入框高度
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // 发送消息核心逻辑 (对接真实 DeepSeek 流式 API)
  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    if (!apiKey.trim()) {
      setShowKeyInput(true);
      return;
    }

    const userMsgId = `u_${Date.now()}`;
    const botMsgId = `b_${Date.now()}`;

    const userMsg: Message = { id: userMsgId, role: 'user', content: text };
    const initialBotMsg: Message = { id: botMsgId, role: 'assistant', content: '' };

    // 1. 立即更新界面：追加用户消息与空白助手消息
    setMessages((prev) => [...prev, userMsg, initialBotMsg]);
    setInput('');
    setIsStreaming(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 构造发送给模型的上下文
    const historyPayload: ChatMessageParam[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await fetchDeepSeekStream(
        historyPayload,
        apiKey,
        (delta) => {
          // 收到新字符，实时更新最后一条助手消息
          setMessages((prev) =>
            prev.map((msg) => (msg.id === botMsgId ? { ...msg, content: msg.content + delta } : msg))
          );
        },
        controller.signal
      );
    } catch (err: unknown) {
      const errorText = (err as Error)?.message || '网络连接异常';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, content: `请求出错: ${errorText}`, error: true }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // 中止生成
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
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

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      {/* 极简右上角 Key 设置入口 */}
      <div className="absolute right-5 top-4 z-20 flex items-center gap-2">
        {showKeyInput ? (
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
            <Key size={14} className="text-gray-400" />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="输入 DeepSeek API Key (sk-...)"
              className="w-56 bg-transparent text-xs text-gray-800 outline-none"
              autoFocus
            />
            <button
              onClick={() => setShowKeyInput(false)}
              className="text-gray-500 hover:text-gray-800"
              title="完成"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowKeyInput(true)}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-800"
            title="配置 API Key"
          >
            <Key size={13} className={apiKey ? 'text-blue-600' : 'text-gray-400'} />
            <span>{apiKey ? 'Key 已配置' : '配置 Key'}</span>
          </button>
        )}
      </div>

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
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white cursor-pointer hover:bg-gray-800"
                    title="停止生成"
                  >
                    <Square size={13} />
                  </button>
                ) : (
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
                )}
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
                    className={`max-w-[85%] text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'rounded-xl bg-gray-100 px-3.5 py-2.5 text-gray-900'
                        : msg.error
                        ? 'rounded-xl bg-red-50 px-3.5 py-2.5 text-red-600 border border-red-200'
                        : 'px-1 py-1 text-gray-900'
                    }`}
                  >
                    {msg.content}
                    {isStreaming && msg.role === 'assistant' && !msg.content && (
                      <span className="inline-block animate-pulse text-gray-400">正在思考...</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* 底部输入卡片 */}
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
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white cursor-pointer hover:bg-gray-800"
                      title="停止生成"
                    >
                      <Square size={13} />
                    </button>
                  ) : (
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
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
