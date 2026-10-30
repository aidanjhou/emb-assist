import { ChatContainer } from '@/components/ChatContainer';

export const metadata = {
  title: 'AI Agent Client - 探索未至之境',
  description: 'AI 交互客户端',
};

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <ChatContainer />
    </main>
  );
}
