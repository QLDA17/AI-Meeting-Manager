import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, FolderOpen, Loader2, MessageSquare, Search, UserRound } from 'lucide-react';

import { useUIStore } from '../../stores';
import { searchService } from '../../services/searchService';
import type { SearchResult } from '../../types';

const typeIcon = {
  meeting: <MessageSquare size={15} className="text-blue-500" />,
  group: <FolderOpen size={15} className="text-emerald-500" />,
  task: <FileText size={15} className="text-amber-500" />,
  transcript: <MessageSquare size={15} className="text-violet-500" />,
};

const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['command-palette-search', debouncedQuery],
    queryFn: () => searchService.search(debouncedQuery),
    enabled: commandPaletteOpen && debouncedQuery.length >= 2,
    staleTime: 15_000,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if (event.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [commandPaletteOpen]);

  const handleNavigate = (result: SearchResult) => {
    setCommandPaletteOpen(false);
    navigate(result.route, result.context ? { state: result.context } : undefined);
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/45 px-4 py-20 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-800">
          <Search size={18} className="text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm cuộc họp, nhóm, việc cần làm..."
            className="w-full bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 dark:text-slate-100"
          />
          <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:bg-slate-800 dark:text-slate-400">
            ESC
          </span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() ? (
            <div className="px-5 py-10 text-center">
              <UserRound size={24} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
                Tìm nhanh cuộc họp, nhóm, việc cần làm và transcript bằng `Cmd/Ctrl + K`.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center px-5 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : results.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-bold text-gray-500 dark:text-slate-400">Không có kết quả phù hợp.</p>
            </div>
          ) : (
            <div className="p-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleNavigate(result)}
                  className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800/70"
                >
                  <span className="mt-0.5 rounded-xl bg-gray-50 p-2 dark:bg-slate-800">
                    {typeIcon[result.type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-gray-900 dark:text-slate-100">{result.title}</span>
                    <span className="block truncate text-xs text-gray-500 dark:text-slate-400">{result.subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
