import React from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, type SortingState, useReactTable } from '@tanstack/react-table';
import { Building, ChevronLeft, ChevronRight, Edit2, Globe, Plus, Search, ToggleLeft, Trash2 } from 'lucide-react';
import type { GlossaryTerm } from '../../types';
import { Badge, Button, Input } from '../../components/ui';

interface GlossaryTableProps {
  data: GlossaryTerm[];
  onDelete?: (id: string) => void;
  onEdit?: (glossary: GlossaryTerm) => void;
  onAdd?: () => void;
  showScope?: boolean;
}

const columnHelper = createColumnHelper<GlossaryTerm>();

const GlossaryTable: React.FC<GlossaryTableProps> = ({ data, onAdd, onDelete, onEdit, showScope = true }) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const filteredData = React.useMemo(() => {
    const term = globalFilter.trim().toLowerCase();
    if (!term) return data;
    return data.filter((item) =>
      [item.term, item.translationVi, item.translationEn, item.category]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term))
    );
  }, [data, globalFilter]);

  const columns = [
    columnHelper.accessor('term', {
      header: 'Thuật ngữ',
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-slate-100">{info.getValue()}</span>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {info.row.original.translationVi || info.row.original.translationEn || 'Chưa có bản dịch'}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('category', {
      header: 'Danh mục',
      cell: (info) => <span className="text-sm text-gray-700 dark:text-slate-300">{info.getValue() || 'General'}</span>,
    }),
    ...(showScope
      ? [
          columnHelper.accessor('scope', {
            header: 'Phạm vi',
            cell: (info) => (
              <Badge variant={info.getValue() === 'GLOBAL' ? 'primary' : 'secondary'} className="flex items-center gap-1">
                {info.getValue() === 'GLOBAL' ? <Globe size={12} /> : <Building size={12} />}
                {info.getValue() === 'GLOBAL' ? 'Hệ thống' : 'Nội bộ'}
              </Badge>
            ),
          }),
        ]
      : []),
    columnHelper.accessor('isActive', {
      header: 'Trạng thái',
      cell: (info) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${info.getValue() ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          <ToggleLeft size={12} />
          {info.getValue() ? 'Đang dùng' : 'Tắt'}
        </span>
      ),
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
  ];

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input placeholder="Tìm kiếm thuật ngữ..." className="pl-10" value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} />
        </div>
        <Button variant="primary" className="flex items-center gap-2" onClick={onAdd}>
          <Plus size={16} />
          Thêm mới
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600 dark:bg-slate-800/50 dark:text-slate-400">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer border-b border-gray-200 px-6 py-4 transition hover:bg-gray-100 dark:border-slate-800 dark:hover:bg-slate-800"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group border-b border-gray-100 transition hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  Chưa có dữ liệu từ điển.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-gray-500">Hiển thị {table.getRowModel().rows.length} trong tổng số {filteredData.length} thuật ngữ</p>
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
