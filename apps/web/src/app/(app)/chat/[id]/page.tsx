'use client';

import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { io, Socket } from 'socket.io-client';

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const { data: messagesData } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      const { data } = await api.get(`/chat/conversations/${id}/messages`, {
        params: { limit: 50 },
      });
      return data;
    },
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      api.post(`/chat/conversations/${id}/messages`, { content }),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', id] });
    },
  });

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('evantix_access_token');
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('conversation.join', { conversationId: id });
    });

    socket.on('message.new', () => {
      qc.invalidateQueries({ queryKey: ['messages', id] });
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, [id, qc]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  const messages = [...(messagesData?.data ?? [])].reverse();

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <Link href="/chat" className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <h1 className="font-semibold text-gray-900">Conversation</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {messages.map((m: { id: string; content: string; senderId: string; sender: { displayName: string }; createdAt: string }) => {
            const isMine = m.senderId === user?.id;
            return (
              <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5',
                  isMine ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900',
                )}>
                  {!isMine && (
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{m.sender.displayName}</p>
                  )}
                  <p className="text-sm">{m.content}</p>
                  <p className={cn('text-[10px] mt-1', isMine ? 'text-primary-200' : 'text-gray-400')}>
                    {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) sendMessage.mutate(text.trim());
          }}
          className="flex gap-2 pt-3 border-t"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input flex-1"
            placeholder="Écrire un message…"
          />
          <button
            type="submit"
            disabled={!text.trim() || sendMessage.isPending}
            className="btn-primary px-4"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
