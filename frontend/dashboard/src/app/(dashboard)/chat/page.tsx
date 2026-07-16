import { PageHeader } from '@/components/ui/PageHeader';
import { ChatWindow } from '@/features/chat/components/ChatWindow';

export default function ChatPage() {
  return (
    <>
      <PageHeader title="Chat" subtitle="Ask the assistant about your knowledge base" />
      <ChatWindow />
    </>
  );
}
