/**
 * GroupChatTab - Tab thảo luận nội bộ trong Nhóm (Phiên bản tương tác cao)
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Pin,
  Smile,
  Paperclip,
  ThumbsUp,
  MessageSquare,
  CheckCheck,
  Trash2,
  Reply,
  X,
} from 'lucide-react';
import { useGroupStore } from '../../stores';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui';
import { toast } from '../ui/Toast';
import api from '../../services/api';
import type { GroupMessage, User } from '../../types';
import { normalizeGroupMessage } from '../../services/mappers';

interface GroupChatTabProps {
  groupId: string;
}

const GroupChatTab: React.FC<GroupChatTabProps> = ({ groupId }) => {
  const { members } = useGroupStore();
  const { user: currentUser } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserId = currentUser?.id;
  const chatReadKey = `group_chat_last_read_by_user_${currentUserId || 'anonymous'}`;

  // Load messages from API
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/api/groups/${groupId}/messages`);
        setMessages(Array.isArray(response.data) ? response.data.map(normalizeGroupMessage) : []);
      } catch (error) {
        toast.error('Không thể tải tin nhắn');
      } finally {
        setIsLoading(false);
      }
    };

    if (groupId) {
      fetchMessages();
    }
  }, [groupId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!groupId || !currentUserId) return;
    const latest = messages[messages.length - 1];
    const raw = localStorage.getItem(chatReadKey);
    const readMap = raw ? JSON.parse(raw) : {};
    readMap[groupId] = latest?.created_at || latest?.createdAt || new Date().toISOString();
    localStorage.setItem(chatReadKey, JSON.stringify(readMap));
  }, [chatReadKey, currentUserId, groupId, messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      const response = await api.post(`/api/groups/${groupId}/messages`, {
        text: messageText.trim(),
      });
      
      const newMessage = normalizeGroupMessage(response.data);
      setMessages((prev) => [...prev, newMessage]);
      setMessageText('');
      setReplyingTo(null);
    } catch (error) {
      toast.error('Không thể gửi tin nhắn');
    }
  };

  const handleLike = async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const reactions = msg.reactions || [];
    const thumbsUpIndex = reactions.findIndex(r => r.emoji === '👍');
    
    let newReactions;
    if (thumbsUpIndex > -1) {
      newReactions = [...reactions];
      newReactions[thumbsUpIndex] = { ...newReactions[thumbsUpIndex], count: newReactions[thumbsUpIndex].count + 1 };
    } else {
      newReactions = [...reactions, { emoji: '👍', count: 1 }];
    }

    try {
      const response = await api.patch(`/api/groups/messages/${messageId}`, {
        reactions: newReactions
      });
      setMessages(prev => prev.map(m => m.id === messageId ? normalizeGroupMessage(response.data) : m));
    } catch (error) {
      toast.error('Không thể cập nhật cảm xúc');
    }
  };

  const handlePin = async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const newPinnedStatus = !msg.is_pinned;

    try {
      const response = await api.patch(`/api/groups/messages/${messageId}`, {
        is_pinned: newPinnedStatus
      });
      
      setMessages(prev => prev.map(m => m.id === messageId ? normalizeGroupMessage(response.data) : m));
      if (newPinnedStatus) toast.success('Đã ghim tin nhắn');
      else toast.success('Đã bỏ ghim tin nhắn');
    } catch (error) {
      toast.error('Không thể thực hiện thao tác ghim');
    }
  };

  const handleDelete = async (messageId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
      try {
        await api.delete(`/api/groups/messages/${messageId}`);
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        toast.success('Đã xóa tin nhắn');
      } catch (error) {
        toast.error('Không thể xóa tin nhắn');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null);
    }
  };

  const getUserById = (userId: string): Partial<User> => {
    return members.find((u) => u.id === userId) || { id: userId, displayName: 'Thành viên', email: '' };
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hôm nay';
    if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const groupedMessages = messages.reduce((acc, msg) => {
    const dateLabel = formatDateLabel(msg.created_at || new Date().toISOString());
    if (!acc[dateLabel]) acc[dateLabel] = [];
    acc[dateLabel].push(msg);
    return acc;
  }, {} as Record<string, GroupMessage[]>);

  const pinnedMessages = messages.filter((m) => m.is_pinned);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[650px]">
      {/* Pinned Section */}
      <AnimatePresence>
        {pinnedMessages.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-4 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/20 dark:bg-amber-900/10 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <Pin size={14} className="fill-current" />
                Tin nhắn đã ghim ({pinnedMessages.length})
              </div>
              <button className="text-[10px] font-bold text-amber-600 hover:underline">Xem tất cả</button>
            </div>
            {pinnedMessages.slice(0, 1).map((msg) => (
              <div key={msg.id} className="flex items-center justify-between">
                <div className="text-sm text-amber-800 dark:text-amber-200 line-clamp-1 italic opacity-80">
                  "{msg.text}"
                </div>
                <button onClick={() => handlePin(msg.id)} className="text-amber-400 hover:text-amber-600 ml-2">
                  <X size={14} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-gray-50 p-6 dark:bg-slate-800">
              <MessageSquare size={48} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chưa có thảo luận</h3>
            <p className="max-w-xs text-sm text-gray-500">Hãy bắt đầu cuộc hội thoại đầu tiên trong nhóm này.</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([dateLabel, msgs]) => (
            <div key={dateLabel} className="space-y-6">
              {/* Date Divider */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200 dark:to-slate-800" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {dateLabel}
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200 dark:to-slate-800" />
              </div>

              {msgs.map((msg) => {
                const user = msg.user || getUserById(msg.user_id || '');
                const isCurrentUser = msg.user_id === currentUserId;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 mt-1">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-black shadow-sm ${
                        isCurrentUser ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-primary-600'
                      }`}>
                        {(user?.displayName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                      </div>
                    </div>

                    {/* Bubble Container */}
                    <div className={`group flex flex-col max-w-[75%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                      {!isCurrentUser && (
                        <span className="mb-1 ml-1 text-xs font-bold text-gray-500 dark:text-slate-400">
                          {user?.displayName || user?.username || 'Thành viên'}
                        </span>
                      )}

                      <div className="relative">
                        <div
                          className={`rounded-3xl px-5 py-3 text-sm leading-relaxed shadow-sm transition-all ${
                            isCurrentUser
                              ? 'bg-primary-600 text-white rounded-tr-none'
                              : 'bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100 rounded-tl-none border border-gray-100 dark:border-slate-700'
                          }`}
                        >
                          {msg.text}
                        </div>
                        
                        {/* Message Actions */}
                        <div className={`absolute top-0 flex gap-1 transition-all opacity-0 group-hover:opacity-100 ${
                          isCurrentUser ? 'right-full mr-2' : 'left-full ml-2'
                        }`}>
                           <button 
                              onClick={() => handleLike(msg.id)}
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-gray-400 hover:text-primary-600 shadow-sm border border-gray-100 dark:border-slate-700"
                            >
                              <ThumbsUp size={14} />
                            </button>
                           <button 
                              onClick={() => setReplyingTo(msg)}
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-gray-400 hover:text-blue-500 shadow-sm border border-gray-100 dark:border-slate-700"
                            >
                              <Reply size={14} />
                            </button>
                           <button 
                              onClick={() => handlePin(msg.id)}
                              className={clsx(
                                "p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 transition-colors",
                                msg.is_pinned ? "text-amber-500" : "text-gray-400 hover:text-amber-500"
                              )}
                            >
                              <Pin size={14} />
                            </button>
                           {isCurrentUser && (
                              <button 
                                onClick={() => handleDelete(msg.id)}
                                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-gray-400 hover:text-red-500 shadow-sm border border-gray-100 dark:border-slate-700"
                              >
                                <Trash2 size={14} />
                              </button>
                           )}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className={`mt-1.5 flex items-center gap-2 px-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter`}>
                        {msg.is_pinned && <Pin size={10} className="text-amber-500 fill-current" />}
                        <span>{formatTime(msg.created_at || '')}</span>
                        {isCurrentUser && <CheckCheck size={12} className="text-primary-500" />}
                      </div>

                      {/* Reactions Bar */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {msg.reactions.map((r, i) => (
                            <button 
                              key={i} 
                              onClick={() => r.emoji === '👍' && handleLike(msg.id)}
                              className="flex items-center gap-1 rounded-full border border-gray-100 bg-white px-2 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-800 hover:bg-primary-50 transition-colors"
                            >
                              <span>{r.emoji}</span>
                              <span className="font-bold">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="mt-6">
        {/* Reply Preview */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="mb-[-20px] pb-5 px-6 pt-3 bg-gray-50 dark:bg-slate-800 rounded-t-[2rem] border-t border-x border-gray-100 dark:border-slate-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Reply size={16} className="text-primary-500" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-primary-600">
                    Đang trả lời {getUserById(replyingTo.user_id || '').displayName || replyingTo.user?.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{replyingTo.text}</p>
                </div>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 transition-all focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/5">
          <div className="flex items-end gap-2 px-2">
            <button className="mb-2 rounded-full p-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800">
              <Paperclip size={20} />
            </button>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nhập tin nhắn thảo luận..."
              rows={1}
              className="w-full resize-none bg-transparent py-3 text-sm font-medium outline-none placeholder:text-gray-400 dark:text-slate-100"
              style={{ minHeight: '44px', maxHeight: '150px' }}
            />
            <div className="mb-2 flex items-center gap-1">
              <button className="rounded-full p-2 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800">
                <Smile size={20} />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-700 active:scale-95 disabled:grayscale disabled:opacity-30 disabled:shadow-none"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <span className="flex items-center gap-1"><kbd className="rounded bg-gray-100 px-1 dark:bg-slate-800 shadow-sm">Enter</kbd> gửi tin</span>
          <span className="flex items-center gap-1"><kbd className="rounded bg-gray-100 px-1 dark:bg-slate-800 shadow-sm">Esc</kbd> hủy trả lời</span>
        </div>
      </div>
    </div>
  );
};

// Helper clsx
function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default GroupChatTab;
