export interface ChatMessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onReasoning?: (chunk: string) => void; // 接收思维链 (DeepSeek-R1)
  onContent: (chunk: string) => void;     // 接收正文回答
}

/**
 * 支持 DeepSeek-R1 思维链与打字机效果的流式客户端
 * @param messages 历史对话数组
 * @param apiKey DeepSeek 开放平台 API Key
 * @param model 模型名称：'deepseek-reasoner' (含思维链) 或 'deepseek-chat' (标准)
 * @param callbacks 流式回调接口
 * @param signal 中止信号量
 */
export async function fetchDeepSeekStream(
  messages: ChatMessageParam[],
  apiKey: string,
  model: 'deepseek-chat' | 'deepseek-reasoner' = 'deepseek-reasoner',
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (!apiKey?.trim()) {
    throw new Error('请先配置 DeepSeek API Key');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      // deepseek-reasoner 不支持自定义 temperature，保持默认即可
    }),
    signal,
  });

  if (!response.ok) {
    let errMessage = response.statusText;
    try {
      const errJson = await response.json();
      errMessage = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      // 保持原始 statusText
    }
    throw new Error(`API 请求失败 (${response.status}): ${errMessage}`);
  }

  if (!response.body) {
    throw new Error('未能从接口获取到数据流');
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
            // 1. DeepSeek-R1 专属思维链字段
            if (delta.reasoning_content && callbacks.onReasoning) {
              callbacks.onReasoning(delta.reasoning_content);
            }
            // 2. 正文最终回答字段
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
