export interface ChatMessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 极简、清晰的 DeepSeek 官方 API 流式请求函数
 * @param messages 历史对话数组
 * @param apiKey DeepSeek 开放平台 API Key
 * @param onChunk 每次收到打字机新字符时的回调
 * @param signal 用于中止生成的信号量 (可选)
 */
export async function fetchDeepSeekStream(
  messages: ChatMessageParam[],
  apiKey: string,
  onChunk: (delta: string) => void,
  signal?: AbortSignal
): Promise<string> {
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
      model: 'deepseek-chat',
      messages,
      stream: true,
      temperature: 0.7,
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
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // 解码当前数据块并拼接到缓冲区
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // 最后未换行的部分保留到下一轮

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data: ')) {
        const dataStr = trimmed.slice(6).trim();
        if (dataStr === '[DONE]') return fullText;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(delta); // 实时向组件推送新增字符
          }
        } catch {
          // 忽略单行非 JSON 内容
        }
      }
    }
  }

  return fullText;
}
