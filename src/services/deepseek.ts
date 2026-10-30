// 向下兼容重定向：所有对话逻辑已统一收敛至后端
export * from './chat';
export { fetchChatStream as fetchDeepSeekStream } from './chat';
