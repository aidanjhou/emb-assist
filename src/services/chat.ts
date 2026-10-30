export interface ChatMessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onReasoning?: (chunk: string) => void; // 接收思维链 (如 DeepSeek-R1)
  onContent: (chunk: string) => void;     // 接收正文回答
}

/**
 * 流式对话客户端（统一连接本地/服务端后端）
 * @param messages 历史对话列表
 * @param model 模型名称，默认传空字符串由后端指定
 * @param callbacks 流式回调接口
 * @param signal 中止信号量
 */
export async function fetchChatStream(
  messages: ChatMessageParam[],
  model: string = '',
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').trim();
  
  // 拼接后端标准 OpenAI 兼容补全接口 /v1/chat/completions
  const endpoint = apiBase.endsWith('/chat/completions')
    ? apiBase
    : `${apiBase.replace(/\/$/, '')}/v1/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    let errMessage = response.statusText;
    try {
      const errJson = await response.json();
      errMessage = errJson.error?.message || errJson.message || JSON.stringify(errJson);
    } catch {
      // 保持原始 statusText
    }
    throw new Error(`后端请求失败 (${response.status}): ${errMessage}`);
  }

  if (!response.body) {
    throw new Error('未能从后端获取到数据流');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data: ')) {
        const dataStr = trimmed.slice(6).trim();
        if (dataStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta;

          if (delta) {
            // 1. 思维链内容 (DeepSeek-R1 / Reasoning)
            if (delta.reasoning_content && callbacks.onReasoning) {
              callbacks.onReasoning(delta.reasoning_content);
            }
            // 2. 正文最终回答内容
            if (delta.content && callbacks.onContent) {
              callbacks.onContent(delta.content);
            }
          }
        } catch {
          // 忽略非 JSON 行
        }
      }
    }
  }
}
