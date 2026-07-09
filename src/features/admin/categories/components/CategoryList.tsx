'use client'

import { useState, useEffect } from 'react'
import { Category } from '@/types/category.type'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Plus, Search } from 'lucide-react'
import { CategoryFormDialog } from './CategoryFormDialog'
import { deleteCategoryAction } from '@/actions/admin/category.actions'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

interface Props {
  initialCategories: Category[]
  totalCount: number
  currentPage: number
  searchTerm: string
}

export function CategoryList({ initialCategories, totalCount, currentPage, searchTerm }: Props) {
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [searchInput, setSearchInput] = useState(searchTerm)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingCategory(null)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return
    
    setIsDeleting(id)
    const result = await deleteCategoryAction(id)
    setIsDeleting(null)
    
    if (result.success) {
      toast.success('Xóa danh mục thành công')
      // Note: revalidatePath will refresh the page from server, but we can also optimistically remove it.
      setCategories(categories.filter(c => c.id !== id))
    } else {
      toast.error(result.error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/admin/categories?search=${encodeURIComponent(searchInput)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <Input 
            placeholder="Tìm kiếm danh mục..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Thêm danh mục
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hình ảnh</TableHead>
              <TableHead>Tên danh mục</TableHead>
              <TableHead>Đường dẫn (Slug)</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-slate-500">
                  Không tìm thấy danh mục nào.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    {category.image_url ? (
                      <img 
                        src={category.image_url} 
                        alt={category.name} 
                        className="w-10 h-10 object-contain rounded border bg-slate-50"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://dummyimage.com/100x100/e2e8f0/64748b.png&text=Loi+Anh'
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded border bg-slate-100 flex items-center justify-center text-xs text-slate-400">Trống</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-slate-500">{category.slug}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {category.is_active ? 'Hiển thị' : 'Đang ẩn'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(category)}>
                      <Pencil className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleDelete(category.id)}
                      disabled={isDeleting === category.id}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Basic Pagination - can be extracted to a separate component later */}
      {totalCount > 10 && (
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            disabled={currentPage <= 1}
            onClick={() => router.push(`/admin/categories?page=${currentPage - 1}${searchTerm ? `&search=${searchTerm}` : ''}`)}
          >
            Trước
          </Button>
          <Button 
            variant="outline" 
            disabled={currentPage * 10 >= totalCount}
            onClick={() => router.push(`/admin/categories?page=${currentPage + 1}${searchTerm ? `&search=${searchTerm}` : ''}`)}
          >
            Sau
          </Button>
        </div>
      )}

      {isDialogOpen && (
        <CategoryFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          initialData={editingCategory}
        />
      )}
    </div>
  )
}
