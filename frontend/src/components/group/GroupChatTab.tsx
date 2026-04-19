/**
 * GroupChatTab - Tab chat thảo luận trong group
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Pin,
  Smile,
  Paperclip,
  ThumbsUp,
  MessageSquare,
  CheckCheck,
} from 'lucide-react';
import { getGroupById, mockUsers } from '../../data';

interface GroupChatTabProps {
  groupId: string;
}

interface Message {
  id: string;
  userId: string;
  text: string;
  timestamp: Date;
  reactions: { emoji: string; count: number }[];
  isPinned?: boolean;
  isEdited?: boolean;
}

const GroupChatTab: React.FC<GroupChatTabProps> = ({ groupId }) => {
  const group = getGroupById(groupId);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-001',
      userId: 'user-002',
      text: 'Mọi người xem summary cuộc họp Q1 Planning chưa? Có nhiều action items quan trọng lắm.',
      timestamp: new Date(Date.now() - 3600000 * 2),
      reactions: [{ emoji: '👍', count: 2 }],
    },
    {
      id: 'msg-002',
      userId: 'user-001',
      text: 'Rồi, tôi đã review xong. Action items đã được assign cho mọi người rồi nhé.',
      timestamp: new Date(Date.now() - 3600000 * 1.5),
      reactions: [{ emoji: '✅', count: 1 }],
      isPinned: true,
    },
    {
      id: 'msg-003',
      userId: 'user-003',
      text: 'Tôi sẽ follow up với client về deal A trong tuần này. Deadline là thứ 6.',
      timestamp: new Date(Date.now() - 3600000),
      reactions: [],
    },
    {
      id: 'msg-004',
      userId: 'user-001',
      text: 'Ok Phạm Văn C nhớ update progress lên hệ thống nhé. Nếu cần support thì ping tôi.',
      timestamp: new Date(Date.now() - 1800000),
      reactions: [{ emoji: '👍', count: 1 }],
    },
  ]);

  const currentUserId = 'user-001'; // Mock current user

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      userId: currentUserId,
      text: messageText.trim(),
      timestamp: new Date(),
      reactions: [],
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getUserById = (userId: string) => {
    return mockUsers.find((u) => u.id === userId);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('vi-VN');
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateLabel = formatDate(msg.timestamp);
    if (!acc[dateLabel]) acc[dateLabel] = [];
    acc[dateLabel].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  const pinnedMessages = messages.filter((m) => m.isPinned);

  return (
    <div className="flex flex-col h-[600px]">
      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
            <Pin size={12} />
            Pinned Messages ({pinnedMessages.length})
          </div>
          {pinnedMessages.map((msg) => {
            const user = getUserById(msg.userId);
            return (
              <div key={msg.id} className="text-xs text-amber-600 dark:text-amber-400 line-clamp-1">
                <span className="font-medium">{user?.displayName || 'Unknown'}:</span> {msg.text}
              </div>
            );
          })}
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {Object.entries(groupedMessages).map(([dateLabel, msgs]) => (
          <div key={dateLabel}>
            {/* Date Divider */}
            <div className="flex items-center justify-center mb-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
              <span className="mx-3 text-xs font-medium text-gray-500 dark:text-slate-400">
                {dateLabel}
              </span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
            </div>

            {/* Messages */}
            {msgs.map((msg) => {
              const user = getUserById(msg.userId);
              const isCurrentUser = msg.userId === currentUserId;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                      {(user?.displayName?.[0] || 'U').toUpperCase()}
                    </div>
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name */}
                    {!isCurrentUser && (
                      <p className="mb-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                        {user?.displayName || 'Unknown'}
                      </p>
                    )}

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isCurrentUser
                          ? 'bg-primary-600 text-white rounded-tr-sm'
                          : 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-slate-100 rounded-tl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>

                    {/* Timestamp & Reactions */}
                    <div className={`mt-1 flex items-center gap-2 ${isCurrentUser ? 'justify-end' : ''}`}>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.isEdited && (
                        <span className="text-xs text-gray-400 dark:text-slate-500">(edited)</span>
                      )}
                      {isCurrentUser && (
                        <CheckCheck size={12} className="text-primary-500" />
                      )}
                    </div>

                    {/* Reactions */}
                    {msg.reactions.length > 0 && (
                      <div className={`mt-1 flex gap-1 ${isCurrentUser ? 'justify-end' : ''}`}>
                        {msg.reactions.map((reaction, idx) => (
                          <button
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                          >
                            <span>{reaction.emoji}</span>
                            <span className="text-gray-600 dark:text-slate-400">{reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-slate-800">
        <div className="flex items-end gap-2">
          <button className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <Paperclip size={18} />
          </button>
          <div className="relative flex-1">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Message #${group?.name || 'group'}...`}
              rows={1}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <Smile size={16} />
            </button>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="rounded-xl bg-primary-600 p-2.5 text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default GroupChatTab;
