'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Product } from '@/types/product.type'
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
import { deleteProductAction } from '@/actions/admin/product.actions'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  initialProducts: Product[]
  totalCount: number
  currentPage: number
  searchTerm: string
}

function AdminProductRowImage({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src)
  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={40}
      height={40}
      className="w-10 h-10 object-cover rounded border bg-slate-50"
      onError={() => {
        setImgSrc('https://dummyimage.com/100x100/e2e8f0/64748b.png&text=Loi+Anh')
      }}
    />
  )
}

export function ProductList({ initialProducts, totalCount, currentPage, searchTerm }: Props) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [searchInput, setSearchInput] = useState(searchTerm)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return
    
    setIsDeleting(id)
    const result = await deleteProductAction(id)
    setIsDeleting(null)
    
    if (result.success) {
      toast.success('Xóa sản phẩm thành công')
      setProducts(products.filter(p => p.id !== id))
    } else {
      toast.error(result.error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/admin/products?search=${encodeURIComponent(searchInput)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <Input 
            placeholder="Tìm kiếm sản phẩm..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <div className="space-x-2 flex">
          <Link href="/admin/products/import" passHref legacyBehavior>
            <Button variant="outline" className="text-emerald-600 border-emerald-600 hover:bg-emerald-50">
              Nhập từ file Excel
            </Button>
          </Link>
          <Link href="/admin/products/create" passHref legacyBehavior>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Thêm sản phẩm
            </Button>
          </Link>
        </div>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hình ảnh</TableHead>
              <TableHead>Tên sản phẩm</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Giá bán</TableHead>
              <TableHead>Tồn kho</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-slate-500">
                  Không tìm thấy sản phẩm nào.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image_url ? (
                      <AdminProductRowImage src={product.image_url} alt={product.name} />
                    ) : (
                      <div className="w-10 h-10 rounded border bg-slate-100 flex items-center justify-center text-xs text-slate-400">Trống</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate" title={product.name}>
                    {product.name}
                  </TableCell>
                  <TableCell className="text-slate-500">{product.category?.name || 'Không có'}</TableCell>
                  <TableCell>
                    {product.sale_price ? (
                      <div>
                        <div className="text-red-600 font-medium">{product.sale_price.toLocaleString('vi-VN')} VND</div>
                        <div className="text-xs text-slate-400 line-through">{product.price.toLocaleString('vi-VN')} VND</div>
                      </div>
                    ) : (
                      <div className="font-medium">{product.price.toLocaleString('vi-VN')} VND</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.stock}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {product.is_active ? 'Hiển thị' : 'Đang ẩn'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/admin/products/${product.id}/edit`} passHref legacyBehavior>
                      <Button variant="outline" size="icon">
                        <Pencil className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleDelete(product.id)}
                      disabled={isDeleting === product.id}
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

      {totalCount > 10 && (
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            disabled={currentPage <= 1}
            onClick={() => router.push(`/admin/products?page=${currentPage - 1}${searchTerm ? `&search=${searchTerm}` : ''}`)}
          >
            Trước
          </Button>
          <Button 
            variant="outline" 
            disabled={currentPage * 10 >= totalCount}
            onClick={() => router.push(`/admin/products?page=${currentPage + 1}${searchTerm ? `&search=${searchTerm}` : ''}`)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  )
}
