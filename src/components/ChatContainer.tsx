'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square, ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { MagicWandIcon } from '@/components/MagicWandIcon';
import { fetchChatStream, ChatMessageParam } from '@/services/chat';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoningContent?: string; // DeepSeek-R1 专属思维链
  error?: boolean;
}

// 独立的思维链折叠展示组件
function ReasoningBlock({
  reasoning,
  isStreaming,
}: {
  reasoning: string;
  isStreaming: boolean;
}) {
  const [expanded, setExpanded] = useState(isStreaming);

  // 流式输出中若有新内容自动展开，生成完毕后用户可自由折叠
  useEffect(() => {
    if (isStreaming) setExpanded(true);
  }, [isStreaming]);

  if (!reasoning) return null;

  return (
    <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50/80 p-2.5 text-xs text-gray-600 transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left font-medium text-gray-700 hover:text-gray-900"
      >
        <span className="flex items-center gap-1.5">
          <Brain size={14} className={isStreaming ? 'animate-pulse text-blue-600' : 'text-gray-500'} />
          <span>{isStreaming ? '正在深度思考...' : '已完成深度思考'}</span>
        </span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {expanded && (
        <div className="mt-2 max-h-60 overflow-y-auto border-t border-gray-200/60 pt-2 font-mono text-[11.5px] leading-relaxed text-gray-500 whitespace-pre-wrap">
          {reasoning}
        </div>
      )}
    </div>
  );
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsgId = `u_${Date.now()}`;
    const botMsgId = `b_${Date.now()}`;

    const userMsg: Message = { id: userMsgId, role: 'user', content: text };
    const initialBotMsg: Message = { id: botMsgId, role: 'assistant', content: '', reasoningContent: '' };

    setMessages((prev) => [...prev, userMsg, initialBotMsg]);
    setInput('');
    setIsStreaming(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const historyPayload: ChatMessageParam[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await fetchChatStream(
        historyPayload,
        '',
        {
          // 1. 接收思维链 (R1)
          onReasoning: (chunk) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? { ...msg, reasoningContent: (msg.reasoningContent || '') + chunk }
                  : msg
              )
            );
          },
          // 2. 接收正文回答 (打字机效果)
          onContent: (chunk) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId ? { ...msg, content: msg.content + chunk } : msg
              )
            );
          },
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
      {/* 极简右上角：后端服务状态指示 */}
      <div className="absolute right-5 top-4 z-20 flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 shadow-sm"
          title="已连接至后端服务"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-[11.5px] font-medium text-gray-600">后端已连接</span>
        </div>
      </div>

      {/* 主体交互区域 */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden w-full">
        {!hasMessages ? (
          /* 初始居中状态 */
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
                placeholder="向 DeepSeek 发送提问测试思维链与打字机效果..."
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
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto py-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex w-full items-start gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="mt-1 shrink-0">
                      <MagicWandIcon size={24} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'rounded-xl bg-gray-100 px-3.5 py-2.5 text-gray-900'
                        : msg.error
                        ? 'rounded-xl bg-red-50 px-3.5 py-2.5 text-red-600 border border-red-200'
                        : 'w-full px-1 py-1 text-gray-900'
                    }`}
                  >
                    {/* 思维链独立折叠展示 */}
                    {msg.role === 'assistant' && msg.reasoningContent && (
                      <ReasoningBlock
                        reasoning={msg.reasoningContent}
                        isStreaming={isStreaming && !msg.content}
                      />
                    )}

                    {/* 正文打字机展示 */}
                    {msg.content}
                    {isStreaming && msg.role === 'assistant' && !msg.content && !msg.reasoningContent && (
                      <span className="inline-block animate-pulse text-gray-400 text-sm">正在连接模型...</span>
                    )}
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
                  placeholder="发送消息..."
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
