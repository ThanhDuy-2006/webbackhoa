'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Product } from '@/types/product.type'
import { Category } from '@/types/category.type'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Plus, Search, Coins, X, Check } from 'lucide-react'
import { deleteProductAction, bulkDeleteProductsAction } from '@/actions/admin/product.actions'
import { executeDirectCostSplitAction } from '@/actions/admin/revenue-share.actions'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  full_name: string | null
  email: string
}

interface Props {
  initialProducts: Product[]
  totalCount: number
  currentPage: number
  searchTerm: string
  categories?: Category[]
  currentCategory?: string
  users?: User[]
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

export function ProductList({ initialProducts, totalCount, currentPage, searchTerm, categories = [], currentCategory = '', users = [] }: Props) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [searchInput, setSearchInput] = useState(searchTerm)
  const [selectedCategory, setSelectedCategory] = useState(currentCategory)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  // Revenue Share State
  const [shareProduct, setShareProduct] = useState<Product | null>(null)
  const [shareMethod, setShareMethod] = useState<'equal' | 'percentage' | 'fixed'>('equal')
  const [shareRecipients, setShareRecipients] = useState<Array<{user_id: string, percentage?: number, fixed_amount?: number}>>([])
  const [shareLoading, setShareLoading] = useState(false)

  // Bulk Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

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
    const searchParams = new URLSearchParams()
    if (searchInput) searchParams.set('search', searchInput)
    if (selectedCategory && selectedCategory !== 'all') searchParams.set('category', selectedCategory)
    router.push(`/admin/products?${searchParams.toString()}`)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(products.map(p => p.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectProduct = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} sản phẩm đã chọn?`)) return
    
    setIsBulkDeleting(true)
    const result = await bulkDeleteProductsAction(selectedIds)
    setIsBulkDeleting(false)
    
    if (result.success) {
      toast.success('Xóa danh sách sản phẩm thành công')
      setProducts(products.filter(p => !selectedIds.includes(p.id)))
      setSelectedIds([])
    } else {
      toast.error(result.error)
    }
  }

  const handleCategoryChange = (value: string | null) => {
    if (value === null) return;
    setSelectedCategory(value)
    const searchParams = new URLSearchParams()
    if (searchInput) searchParams.set('search', searchInput)
    if (value && value !== 'all') searchParams.set('category', value)
    router.push(`/admin/products?${searchParams.toString()}`)
  }

  const calculateAmount = (recipient: any) => {
    if (!shareProduct) return 0
    const base = shareProduct.price
    
    if (shareMethod === 'equal') {
      return shareRecipients.length > 0 ? Math.round(base / shareRecipients.length) : 0
    } else if (shareMethod === 'percentage') {
      return Math.round(base * ((recipient.percentage || 0) / 100))
    } else {
      return recipient.fixed_amount || 0
    }
  }

  const handleShareSubmit = async () => {
    if (!shareProduct) return
    if (shareRecipients.length === 0) return toast.error('Vui lòng chọn ít nhất một người nhận')
    
    if (shareMethod === 'percentage') {
      const totalPct = shareRecipients.reduce((sum, r) => sum + (r.percentage || 0), 0)
      if (Math.round(totalPct) !== 100) {
        return toast.error('Tổng tỷ lệ chia phải bằng đúng 100%')
      }
    } else if (shareMethod === 'fixed') {
      for (const r of shareRecipients) {
        if (!r.fixed_amount || r.fixed_amount <= 0) {
          return toast.error('Số tiền cố định của mỗi người nhận phải lớn hơn 0')
        }
      }
    }

    if (!confirm('Bạn có chắc chắn muốn thực hiện giao dịch chia tiền khấu trừ ví các thành viên ngay lập tức?')) return

    setShareLoading(true)
    const res = await executeDirectCostSplitAction({
      products: [{
        product_id: shareProduct.id,
        amount: shareProduct.price, // Or sale_price if you want, let's use price as a base and 0 discount
        quantity: 1,
        discount: 0
      }],
      sharing_method: shareMethod,
      recipients: shareRecipients.map(r => ({
        user_id: r.user_id,
        percentage: shareMethod === 'percentage' ? r.percentage : null,
        fixed_amount: shareMethod === 'fixed' ? r.fixed_amount : null
      }))
    })
    setShareLoading(false)

    if (res.success) {
      toast.success('Khấu trừ và chia tiền trực tiếp thành công!')
      setShareProduct(null)
      setShareRecipients([])
    } else {
      toast.error(res.error || 'Có lỗi xảy ra')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-2 max-w-2xl w-full">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:max-w-sm relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              placeholder="Tìm kiếm sản phẩm..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 bg-white hover:border-emerald-300 transition-all shadow-sm"
            />
            <Button type="submit" variant="secondary" className="rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 shadow-sm border border-slate-200 transition-all">
              Tìm
            </Button>
          </form>
          {categories.length > 0 && (
            <Select value={selectedCategory || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[200px] rounded-xl border-slate-200 bg-white hover:border-emerald-300 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-sm transition-all data-[state=open]:border-emerald-500">
                <SelectValue placeholder="Tất cả danh mục" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-lg shadow-emerald-900/5">
                <SelectItem value="all" className="rounded-lg focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer">Tất cả danh mục</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id} className="rounded-lg focus:bg-emerald-50 focus:text-emerald-700 cursor-pointer">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete} 
              disabled={isBulkDeleting}
              className="rounded-xl shadow-sm transition-all"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa ({selectedIds.length})
            </Button>
          )}
        </div>
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
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={products.length > 0 && selectedIds.length === products.length}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                />
              </TableHead>
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
                <TableCell colSpan={8} className="text-center h-24 text-slate-500">
                  Không tìm thấy sản phẩm nào.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                    />
                  </TableCell>
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
                    {product.variants && product.variants.length > 0 ? (
                      <div>
                        <div className="font-medium">{product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)}</div>
                        <div className="text-xs text-emerald-600">{product.variants.length} phân loại</div>
                      </div>
                    ) : (
                      <div>{product.stock}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {product.is_active ? 'Hiển thị' : 'Đang ẩn'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      title="Chia tiền"
                      onClick={() => {
                        setShareProduct(product)
                        setShareRecipients([])
                        setShareMethod('equal')
                      }}
                    >
                      <Coins className="h-4 w-4 text-orange-500" />
                    </Button>
                    <Link href={`/admin/products/${product.id}/edit`} passHref legacyBehavior>
                      <Button variant="outline" size="icon" title="Chỉnh sửa">
                        <Pencil className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      title="Xóa"
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

      {/* Revenue Share Dialog */}
      <Dialog open={!!shareProduct} onOpenChange={(open) => !open && setShareProduct(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-orange-500" />
              Chia tiền khấu trừ trực tiếp
            </DialogTitle>
          </DialogHeader>

          {shareProduct && (
            <div className="space-y-6 py-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">{shareProduct.name}</h4>
                  <p className="text-sm text-slate-500 mt-1">Giá bán: <span className="font-semibold text-emerald-600">{shareProduct.price.toLocaleString('vi-VN')} VND</span></p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Phương thức chia</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={shareMethod === 'equal'} onChange={() => setShareMethod('equal')} className="text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm">Chia đều</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={shareMethod === 'percentage'} onChange={() => setShareMethod('percentage')} className="text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm">Theo phần trăm (%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={shareMethod === 'fixed'} onChange={() => setShareMethod('fixed')} className="text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm">Số tiền cố định (VNĐ)</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Người nhận tiền (Khấu trừ ví)</label>
                
                {shareRecipients.map((recipient, idx) => {
                  const user = users.find(u => u.id === recipient.user_id)
                  const amount = calculateAmount(recipient)
                  
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex-1 font-medium text-sm">
                        {user?.full_name || user?.email}
                      </div>
                      
                      {amount > 0 && (
                        <div className="text-emerald-600 font-semibold text-sm">
                          -{amount.toLocaleString('vi-VN')} đ
                        </div>
                      )}
                      
                      {shareMethod === 'percentage' && (
                        <div className="flex items-center gap-2 w-32">
                          <Input 
                            type="number" 
                            min={0} max={100}
                            value={recipient.percentage || ''} 
                            onChange={(e) => {
                              const newRecipients = [...shareRecipients]
                              newRecipients[idx].percentage = Number(e.target.value)
                              setShareRecipients(newRecipients)
                            }}
                            className="h-9 rounded-lg"
                            placeholder="%"
                          />
                          <span className="text-sm text-slate-500">%</span>
                        </div>
                      )}

                      {shareMethod === 'fixed' && (
                        <div className="flex items-center gap-2 w-40">
                          <Input 
                            type="number" 
                            min={0}
                            value={recipient.fixed_amount || ''} 
                            onChange={(e) => {
                              const newRecipients = [...shareRecipients]
                              newRecipients[idx].fixed_amount = Number(e.target.value)
                              setShareRecipients(newRecipients)
                            }}
                            className="h-9 rounded-lg"
                            placeholder="VNĐ"
                          />
                        </div>
                      )}

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        onClick={() => {
                          const newRecipients = [...shareRecipients]
                          newRecipients.splice(idx, 1)
                          setShareRecipients(newRecipients)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}

                <div className="mt-2">
                  <Select key={shareRecipients.length} onValueChange={(val: string | null) => {
                    if (val === null) return;
                    if (!shareRecipients.find(r => r.user_id === val)) {
                      setShareRecipients([...shareRecipients, { user_id: val }])
                    }
                  }}>
                    <SelectTrigger className="w-full rounded-xl border-dashed bg-slate-50 border-slate-300 hover:border-emerald-400 transition-colors">
                      <SelectValue placeholder="+ Thêm người nhận" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 rounded-xl">
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id} disabled={shareRecipients.some(r => r.user_id === u.id)}>
                          {u.full_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareProduct(null)} className="rounded-xl">Hủy</Button>
            <Button onClick={handleShareSubmit} disabled={shareLoading || shareRecipients.length === 0} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
              {shareLoading ? 'Đang xử lý...' : 'Xác nhận chia tiền'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
