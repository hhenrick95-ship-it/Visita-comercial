import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIChat } from './AIChat';

export const AIChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  // Pesquisas públicas (sem login) não mostram o chat
  if (pathname.startsWith('/pesquisa')) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
      
      <AIChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
