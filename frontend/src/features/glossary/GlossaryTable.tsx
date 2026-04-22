import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
} from '@tanstack/react-table';
import { 
  Search, 
  Download, 
  Upload as UploadIcon, 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronLeft, 
  ChevronRight, 
  Globe, 
  Building 
} from 'lucide-react';
import { type Glossary } from '../../stores/glossaryStore';
import { Button, Input, Badge } from '../../components/ui';

interface GlossaryTableProps {
  data: Glossary[];
  onDelete?: (id: string) => void;
  onEdit?: (glossary: Glossary) => void;
  onAdd?: () => void;
  showScope?: boolean;
}

const columnHelper = createColumnHelper<Glossary>();

const GlossaryTable: React.FC<GlossaryTableProps> = ({ 
  data, 
  onDelete, 
  onEdit, 
  onAdd,
  showScope = true 
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const columns = [
    columnHelper.accessor('name', {
      header: 'Tên thư viện',
      cell: (info) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-slate-100">{info.getValue()}</span>
          {info.row.original.description && (
            <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[300px]">
              {info.row.original.description}
            </span>
          )}
        </div>
      ),
    }),
    ...(showScope ? [
      columnHelper.accessor('scope', {
        header: 'Phạm vi',
        cell: (info) => (
          <Badge variant={info.getValue() === 'GLOBAL' ? 'primary' : 'secondary'} className="flex items-center gap-1">
            {info.getValue() === 'GLOBAL' ? <Globe size={12} /> : <Building size={12} />}
            {info.getValue() === 'GLOBAL' ? 'Hệ thống' : 'Nội bộ'}
          </Badge>
        ),
      })
    ] : []),
    columnHelper.accessor('termCount', {
      header: 'Số lượng từ',
      cell: (info) => (
        <span className="font-medium text-gray-700 dark:text-slate-300">
          {info.getValue().toLocaleString()} từ
        </span>
      ),
    }),
    columnHelper.accessor('lastUpdated', {
      header: 'Cập nhật cuối',
      cell: (info) => (
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Thao tác',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onEdit?.(info.row.original)}
            className="p-1.5 text-gray-500 hover:text-primary-600 transition"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => onDelete?.(info.row.original.id)}
            className="p-1.5 text-gray-500 hover:text-red-600 transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input 
            placeholder="Tìm kiếm thư viện từ vựng..." 
            className="pl-10"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="flex items-center gap-2">
            <Download size={16} />
            Xuất Excel
          </Button>
          <Button variant="ghost" className="flex items-center gap-2">
            <UploadIcon size={16} />
            Nhập Excel
          </Button>
          <Button variant="primary" className="flex items-center gap-2" onClick={onAdd}>
            <Plus size={16} />
            Thêm mới
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 uppercase text-xs font-semibold">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th 
                    key={header.id} 
                    className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.id} 
                  className="group hover:bg-gray-50 dark:hover:bg-slate-800/30 transition border-b border-gray-100 dark:border-slate-800"
                >
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
                  Chưa có dữ liệu thư viện từ vựng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-gray-500">
          Hiển thị {table.getRowModel().rows.length} trong tổng số {data.length} thư viện
        </p>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft size={18} />
          </Button>
          <div className="flex items-center gap-1">
             {Array.from({ length: table.getPageCount() }, (_, i) => (
               <button
                 key={i}
                 onClick={() => table.setPageIndex(i)}
                 className={`w-8 h-8 rounded-lg text-sm font-medium transition ${table.getState().pagination.pageIndex === i ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
               >
                 {i + 1}
               </button>
             ))}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GlossaryTable;
