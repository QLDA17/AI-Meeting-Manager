import React from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Edit2,
  Languages,
  Plus,
  Search,
  Tags,
  ToggleLeft,
  Trash2,
} from 'lucide-react';
import type { GlossaryTerm } from '../../types';
import { Badge, Button, Input } from '../../components/ui';

interface GlossaryTableProps {
  data: GlossaryTerm[];
  categories?: string[];
  onDelete?: (id: string) => void;
  onEdit?: (glossary: GlossaryTerm) => void;
  onAdd?: () => void;
}

const columnHelper = createColumnHelper<GlossaryTerm>();

const countFilledTranslations = (item: GlossaryTerm) =>
  [item.translationVi, item.translationEn, item.translationJa, item.translationZh, item.translationKo].filter(Boolean).length;

const GlossaryTable: React.FC<GlossaryTableProps> = ({ data, categories = [], onAdd, onDelete, onEdit }) => {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'updatedAt', desc: true }]);
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [translationFilter, setTranslationFilter] = React.useState('all');

  const filteredData = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesQuery =
        !query ||
        [item.term, item.category, item.translationVi, item.translationEn, ...item.aliases]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query));

      const matchesCategory = categoryFilter === 'all' || (item.category || '') === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.isActive) ||
        (statusFilter === 'inactive' && !item.isActive);

      const translationCount = countFilledTranslations(item);
      const matchesTranslation =
        translationFilter === 'all' ||
        (translationFilter === 'missing' && translationCount === 0) ||
        (translationFilter === 'partial' && translationCount > 0 && translationCount < 5) ||
        (translationFilter === 'complete' && translationCount === 5);

      return matchesQuery && matchesCategory && matchesStatus && matchesTranslation;
    });
  }, [categoryFilter, data, search, statusFilter, translationFilter]);

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('term', {
        header: 'Canonical term',
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="space-y-2">
              <div>
                <div className="font-semibold text-gray-900 dark:text-slate-100">{item.term}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {item.aliases.length > 0 ? item.aliases.join(', ') : 'Chưa có alias cho STT'}
                </div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'aliases',
        header: 'Aliases',
        cell: (info) => (
          <Badge variant={info.row.original.aliases.length > 0 ? 'secondary' : 'amber'} className="gap-1">
            <Tags size={12} />
            {info.row.original.aliases.length}
          </Badge>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Danh mục',
        cell: (info) => <span className="text-sm text-gray-700 dark:text-slate-300">{info.getValue() || 'Uncategorized'}</span>,
      }),
      columnHelper.accessor('isActive', {
        header: 'Trạng thái',
        cell: (info) => (
          <Badge variant={info.getValue() ? 'primary' : 'secondary'} className="gap-1">
            <ToggleLeft size={12} />
            {info.getValue() ? 'Active' : 'Inactive'}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: 'languages',
        header: 'Bản dịch',
        cell: (info) => {
          const item = info.row.original;
          const langs = [
            { code: 'VI', name: 'Tiếng Việt', active: !!item.translationVi },
            { code: 'EN', name: 'English', active: !!item.translationEn },
            { code: 'JA', name: '日本語', active: !!item.translationJa },
            { code: 'ZH', name: '中文', active: !!item.translationZh },
            { code: 'KO', name: '한국어', active: !!item.translationKo },
          ];
          return (
            <div className="flex items-center gap-1">
              {langs.map((lang) => (
                <span
                  key={lang.code}
                  title={lang.name}
                  className={`inline-flex h-5 px-1.5 items-center justify-center rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                    lang.active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30'
                      : 'border border-dashed border-gray-200 text-gray-300 bg-transparent dark:border-slate-800 dark:text-slate-700'
                  }`}
                >
                  {lang.code}
                </span>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor('updatedAt', {
        header: 'Cập nhật',
        cell: (info) => {
          const date = new Date(info.getValue());
          return <span className="text-sm text-gray-600 dark:text-slate-300">{date.toLocaleDateString()}</span>;
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Thao tác',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit?.(info.row.original)} className="p-1.5 text-gray-500 transition hover:text-primary-600">
              <Edit2 size={16} />
            </button>
            <button onClick={() => onDelete?.(info.row.original.id)} className="p-1.5 text-gray-500 transition hover:text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        ),
      }),
    ],
    [onDelete, onEdit]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 rounded-3xl border border-gray-150/50 bg-gray-50/30 p-5 dark:border-slate-800/80 dark:bg-slate-900/40 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5 text-sm">
            <span className="block font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500">Tìm kiếm thuật ngữ</span>
            <Input
              placeholder="Tìm theo term, alias, danh mục..."
              className="pl-10 h-11 rounded-2xl bg-white border-gray-200/80 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-primary-900/20"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              leftIcon={<Search size={18} className="text-gray-400 dark:text-slate-500" />}
            />
          </div>
          <div className="space-y-1.5 text-sm">
            <span className="block font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500">Danh mục</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-11 w-full rounded-2xl border border-gray-200/80 bg-white px-3.5 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 text-sm">
            <span className="block font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500">Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full rounded-2xl border border-gray-200/80 bg-white px-3.5 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="space-y-1.5 text-sm">
            <span className="block font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-500">Bản dịch</span>
            <select
              value={translationFilter}
              onChange={(event) => setTranslationFilter(event.target.value)}
              className="h-11 w-full rounded-2xl border border-gray-200/80 bg-white px-3.5 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">Tất cả bản dịch</option>
              <option value="missing">Thiếu toàn bộ</option>
              <option value="partial">Điền một phần</option>
              <option value="complete">Đủ 5 ngôn ngữ</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end xl:self-auto pb-[1px]">
          { (search || categoryFilter !== 'all' || statusFilter !== 'all' || translationFilter !== 'all') && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setStatusFilter('all');
                setTranslationFilter('all');
              }}
              className="text-xs text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200 h-11"
            >
              Reset bộ lọc
            </Button>
          )}
          <Button variant="primary" className="flex h-11 items-center gap-2 rounded-2xl px-5 shadow-lg shadow-primary-600/15" onClick={onAdd}>
            <Plus size={16} className="stroke-[3]" />
            Thêm thuật ngữ
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:bg-slate-800/30 dark:text-slate-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="group cursor-pointer select-none border-b border-gray-100 px-6 py-4 transition hover:bg-gray-100 dark:border-slate-800/80 dark:hover:bg-slate-800/40"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-gray-500 dark:text-slate-400">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                      {header.column.getCanSort() && (
                        <span className="inline-flex items-center transition-all duration-300">
                          {header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown size={13} className="text-primary-500 stroke-[3]" />
                          ) : header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp size={13} className="text-primary-500 stroke-[3]" />
                          ) : (
                            <ChevronDown size={13} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity dark:text-slate-600" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group border-b border-gray-100/60 transition-all duration-300 hover:bg-primary-50/15 dark:border-slate-800/60 dark:hover:bg-primary-950/5">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center space-y-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 dark:bg-slate-800/50 dark:text-slate-500">
                      <BookOpen size={28} className="stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-slate-200">Không tìm thấy thuật ngữ</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc đặt lại các bộ lọc để tìm được thuật ngữ thích hợp.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearch('');
                        setCategoryFilter('all');
                        setStatusFilter('all');
                        setTranslationFilter('all');
                      }}
                      className="mt-2 text-[11px] h-8 rounded-xl px-4"
                    >
                      Đặt lại bộ lọc
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-gray-500">
          Hiển thị {table.getRowModel().rows.length} trong tổng số {filteredData.length} thuật ngữ
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            <ChevronLeft size={18} />
          </Button>
          <Button variant="ghost" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GlossaryTable;
