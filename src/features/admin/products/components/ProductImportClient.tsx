'use client'

import { useState } from 'react'
import { Category } from '@/types/category.type'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Search, 
  ImageIcon, 
  ExternalLink,
  Loader2 
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { ProductFormData } from '@/schemas/product.schema'
import { bulkCreateProductsAction } from '@/actions/admin/product.actions'
import { generateProductImageAction, selectManualCandidateAction } from '@/actions/admin/image.actions'
import { ImageCandidate } from '@/lib/images/types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'

interface Props {
  categories: Category[]
}

export interface EditableImportProduct extends ProductFormData {
  tempId: string
  candidateSessionId?: string | null
  candidates?: ImageCandidate[]
  isSearchingImage?: boolean
  imageError?: string | null
}

export function ProductImportClient({ categories }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [autoSearchingBatch, setAutoSearchingBatch] = useState(false)
  const [autoSearchProgress, setAutoSearchProgress] = useState({ current: 0, total: 0 })
  const [importData, setImportData] = useState<EditableImportProduct[]>([])
  const [rawText, setRawText] = useState('')

  // Dialog state for candidate selection on an individual row
  const [selectedRowForImage, setSelectedRowForImage] = useState<EditableImportProduct | null>(null)
  const [isSearchingSingleImage, setIsSearchingSingleImage] = useState(false)

  // 1. Process Excel/Text JSON Data
  const processData = async (jsonData: any[]) => {
    const parsedProducts: EditableImportProduct[] = []

    jsonData.forEach((row: any, idx: number) => {
      // Find category by name (fuzzy search)
      let category_id: string | null = null
      if (row['Danh mục']) {
        const cleanName = String(row['Danh mục']).toLowerCase().trim()
        
        let cat = categories.find(c => c.name.toLowerCase() === cleanName || c.slug === cleanName)
        
        if (!cat) {
          if (cleanName.includes('rau') || cleanName.includes('củ') || cleanName.includes('quả') || cleanName.includes('thực vật')) {
            cat = categories.find(c => c.slug === 'rau-cu-qua')
          } else if (cleanName.includes('thịt') || cleanName.includes('cá') || cleanName.includes('hải sản') || cleanName.includes('tươi sống') || cleanName.includes('bò') || cleanName.includes('gà') || cleanName.includes('hồi')) {
            cat = categories.find(c => c.slug === 'thit-ca')
          } else if (cleanName.includes('trái') || cleanName.includes('cây') || cleanName.includes('hoa quả') || cleanName.includes('fuji') || cleanName.includes('chuối') || cleanName.includes('táo') || cleanName.includes('cam')) {
            if (cleanName.includes('nước') || cleanName.includes('ép')) {
              cat = categories.find(c => c.slug === 'do-uong')
            } else {
              cat = categories.find(c => c.slug === 'trai-cay')
            }
          } else if (cleanName.includes('nước') || cleanName.includes('uống') || cleanName.includes('sữa') || cleanName.includes('bia') || cleanName.includes('rượu') || cleanName.includes('giải khát') || cleanName.includes('trà')) {
            cat = categories.find(c => c.slug === 'do-uong')
          } else if (cleanName.includes('khô') || cleanName.includes('gạo') || cleanName.includes('mì') || cleanName.includes('đậu') || cleanName.includes('hạt') || cleanName.includes('ngũ cốc')) {
            cat = categories.find(c => c.slug === 'thuc-pham-kho')
          }
        }
        
        if (!cat) {
          cat = categories.find(c => c.name.toLowerCase().includes(cleanName) || cleanName.includes(c.name.toLowerCase()))
        }
        
        if (cat) {
          category_id = cat.id
        }
      }

      const parseNumber = (val: any) => {
        if (!val) return null
        if (typeof val === 'number') return val
        const cleanStr = String(val).replace(/[^0-9.-]+/g, '')
        const num = Number(cleanStr)
        return isNaN(num) ? null : num
      }

      const price = parseNumber(row['Giá bán']) || 0
      const sale_price = parseNumber(row['Giá khuyến mãi'])
      const stock = parseNumber(row['Tồn kho']) || 0
      const name = row['Tên sản phẩm'] ? String(row['Tên sản phẩm']).trim() : ''

      if (name) {
        const imageUrl = row['Hình ảnh'] ? String(row['Hình ảnh']).trim() : null
        parsedProducts.push({
          tempId: `import-${idx}-${Date.now()}`,
          name,
          slug: '',
          category_id,
          description: row['Mô tả'] ? String(row['Mô tả']) : '',
          price,
          sale_price,
          stock,
          image_url: imageUrl,
          image_source: imageUrl ? 'manual' : 'auto',
          image_status: imageUrl ? 'valid' : 'unchecked',
          images: imageUrl ? [imageUrl] : [],
          is_active: true,
          is_featured: false,
          variants: []
        })
      }
    })

    if (parsedProducts.length === 0) {
      toast.error('Không tìm thấy sản phẩm nào hợp lệ trong dữ liệu')
      return
    }

    setImportData(parsedProducts)
    toast.success(`Đã đọc được ${parsedProducts.length} sản phẩm hợp lệ`)

    // 2. Automatically trigger Image Search API for rows missing images
    const missingImageRows = parsedProducts.filter(p => !p.image_url)
    if (missingImageRows.length > 0) {
      autoFetchImagesForBatch(parsedProducts)
    }
  }

  // Auto-fetch images for batch of rows missing images (Parallel Batch Processing)
  const autoFetchImagesForBatch = async (products: EditableImportProduct[]) => {
    setAutoSearchingBatch(true)
    const missingIndices = products
      .map((p, i) => (!p.image_url ? i : -1))
      .filter(i => i !== -1)

    setAutoSearchProgress({ current: 0, total: missingIndices.length })

    const updated = [...products]
    const BATCH_SIZE = 4
    let completedCount = 0

    for (let i = 0; i < missingIndices.length; i += BATCH_SIZE) {
      const batchIndices = missingIndices.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batchIndices.map(async (idx) => {
          const prod = updated[idx]
          try {
            const res = await generateProductImageAction(
              prod.name,
              null,
              prod.tempId,
              false
            )

            if (res.status === 'auto_selected' && res.url) {
              updated[idx] = {
                ...updated[idx],
                image_url: res.url,
                image_source: 'auto',
                image_status: 'valid',
                images: [res.url],
              }
            } else if (res.status === 'manual_selection_required' && res.candidates && res.candidates.length > 0) {
              const topCandidate = res.candidates[0]
              updated[idx] = {
                ...updated[idx],
                image_url: topCandidate.url,
                image_source: 'auto',
                image_status: 'valid',
                images: [topCandidate.url],
                candidateSessionId: res.candidateSessionId,
                candidates: res.candidates,
              }
            }
          } catch (err) {
            console.error(`Auto image search failed for ${prod.name}:`, err)
          } finally {
            completedCount++
            setAutoSearchProgress({ current: completedCount, total: missingIndices.length })
          }
        })
      )

      setImportData([...updated])
    }

    setAutoSearchingBatch(false)
    toast.success('Đã hoàn tất tự động tìm ảnh cho các sản phẩm trống ảnh!')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)
      processData(jsonData)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleTextImport = () => {
    if (!rawText.trim()) return
    try {
      const workbook = XLSX.read(rawText, { type: 'string' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)
      processData(jsonData)
    } catch (error) {
      toast.error('Định dạng văn bản không hợp lệ')
    }
  }

  // Row operations
  const handleUpdateRow = (tempId: string, field: keyof EditableImportProduct, value: any) => {
    setImportData(prev =>
      prev.map(item => {
        if (item.tempId === tempId) {
          const updated = { ...item, [field]: value }
          if (field === 'image_url') {
            updated.images = value ? [value] : []
            updated.image_source = 'manual'
          }
          return updated
        }
        return item
      })
    )
  }

  const handleDeleteRow = (tempId: string) => {
    setImportData(prev => prev.filter(item => item.tempId !== tempId))
    toast.info('Đã xóa sản phẩm khỏi danh sách')
  }

  const handleAddBlankRow = () => {
    const newRow: EditableImportProduct = {
      tempId: `new-${Date.now()}`,
      name: '',
      slug: '',
      category_id: categories.length > 0 ? categories[0].id : null,
      description: '',
      price: 0,
      sale_price: null,
      stock: 10,
      image_url: null,
      image_source: 'auto',
      image_status: 'unchecked',
      images: [],
      is_active: true,
      is_featured: false,
      variants: []
    }
    setImportData(prev => [...prev, newRow])
  }

  // Trigger image search for a specific row
  const handleSearchImageForRow = async (row: EditableImportProduct) => {
    if (!row.name || row.name.trim().length < 2) {
      toast.error('Tên sản phẩm phải có ít nhất 2 ký tự')
      return
    }

    setSelectedRowForImage(row)
    setIsSearchingSingleImage(true)

    try {
      const res = await generateProductImageAction(
        row.name,
        null,
        row.tempId,
        true
      )

      if (res.status === 'auto_selected' && res.url) {
        handleUpdateRow(row.tempId, 'image_url', res.url)
        setSelectedRowForImage(prev => prev ? { ...prev, image_url: res.url, candidates: [] } : null)
        toast.success(`Đã tự động chọn ảnh phù hợp nhất cho ${row.name}`)
      } else if (res.status === 'manual_selection_required' && res.candidates) {
        setSelectedRowForImage(prev => prev ? {
          ...prev,
          candidateSessionId: res.candidateSessionId,
          candidates: res.candidates,
          imageError: res.reason
        } : null)

        // Pre-select top candidate
        if (res.candidates.length > 0) {
          handleUpdateRow(row.tempId, 'image_url', res.candidates[0].url)
        }
      } else if (res.status === 'not_found') {
        toast.error(res.reason)
      } else if (res.status === 'error') {
        toast.error(res.message)
      }
    } catch (e) {
      toast.error('Lỗi khi tìm ảnh')
    } finally {
      setIsSearchingSingleImage(false)
    }
  }

  // Select candidate from Dialog
  const handleSelectCandidateInDialog = async (candidate: ImageCandidate) => {
    if (!selectedRowForImage || !selectedRowForImage.candidateSessionId) {
      // Direct selection fallback
      handleUpdateRow(selectedRowForImage!.tempId, 'image_url', candidate.url)
      setSelectedRowForImage(prev => prev ? { ...prev, image_url: candidate.url } : null)
      toast.success('Đã chọn ảnh thành công')
      return
    }

    try {
      const res = await selectManualCandidateAction({
        formSessionId: selectedRowForImage.tempId,
        candidateSessionId: selectedRowForImage.candidateSessionId,
        candidateId: candidate.id,
      })

      if (res.success && res.url) {
        handleUpdateRow(selectedRowForImage.tempId, 'image_url', res.url)
        setSelectedRowForImage(prev => prev ? { ...prev, image_url: res.url } : null)
        toast.success('Đã chọn ảnh thành công!')
      } else {
        toast.error(res.error || 'Không thể chọn ảnh này')
      }
    } catch (err) {
      toast.error('Lỗi khi xác nhận chọn ảnh')
    }
  }

  // Final submit to DB
  const handleConfirmImport = async () => {
    const validItems = importData.filter(p => p.name && p.name.trim().length >= 2)
    if (validItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 sản phẩm hợp lệ có tên trước khi nhập!')
      return
    }

    setLoading(true)
    const result = await bulkCreateProductsAction(validItems)
    setLoading(false)

    if (result.success) {
      const createdCount = result.results?.success || 0
      const mergedCount = result.results?.merged || 0
      
      let msg = `Hoàn tất nhập dữ liệu!`
      if (createdCount > 0 && mergedCount > 0) {
        msg = `Thêm mới ${createdCount} sản phẩm, gộp tồn kho ${mergedCount} sản phẩm trùng tên!`
      } else if (mergedCount > 0) {
        msg = `Đã gộp số lượng cho ${mergedCount} sản phẩm đã có trong cơ sở dữ liệu!`
      } else {
        msg = `Thêm thành công ${createdCount} sản phẩm vào cơ sở dữ liệu!`
      }
      toast.success(msg)

      if (result.results?.failed && result.results.failed > 0) {
        toast.error(`Thất bại ${result.results.failed} sản phẩm.`)
        console.error('Lỗi nhập:', result.results.errors)
      }
      setTimeout(() => {
        router.push('/admin/products')
      }, 1500)
    } else {
      toast.error(result.error || 'Có lỗi xảy ra khi nhập dữ liệu')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Excel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" /> Nhập từ file Excel / CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Tải lên file .xlsx hoặc .csv. Cột yêu cầu: Tên sản phẩm, Giá bán, Giá khuyến mãi, Tồn kho, Danh mục, Hình ảnh, Mô tả.
              <span className="block mt-1 font-semibold text-emerald-700">
                ✨ Nếu cột Hình ảnh bị trống, hệ thống sẽ tự động sử dụng AI để tìm và gán ảnh hợp lý nhất!
              </span>
            </p>
            <Input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
          </CardContent>
        </Card>

        {/* Paste Text */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" /> Nhập từ Text (Copy/Paste)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Dán nội dung bảng từ Excel hoặc Google Sheets trực tiếp vào đây.
            </p>
            <textarea 
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full h-24 p-2 border rounded-md text-sm font-mono"
              placeholder="Tên sản phẩm&#9;Giá bán&#9;Tồn kho..."
            />
            <Button onClick={handleTextImport} variant="secondary" className="w-full">
              Phân tích Text
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Progress banner for batch image search */}
      {autoSearchingBatch && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <div>
              <p className="font-semibold text-sm">Đang tự động tìm kiếm ảnh bằng AI cho sản phẩm chưa có ảnh...</p>
              <p className="text-xs text-emerald-700">Đã xử lý {autoSearchProgress.current} / {autoSearchProgress.total} sản phẩm</p>
            </div>
          </div>
        </div>
      )}

      {/* Editable Preview Table */}
      {importData.length > 0 && (
        <Card className="border-slate-300 shadow-md">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b bg-slate-50/50 pb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Kiểm tra & Chỉnh sửa trước khi thêm ({importData.length} sản phẩm)
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có thể sửa tên, giá, danh mục, đổi/tìm lại ảnh hoặc xóa bớt hàng trước khi lưu vào CSDL.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddBlankRow}
                className="text-xs border-dashed"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Thêm sản phẩm
              </Button>

              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                disabled={autoSearchingBatch}
                onClick={() => autoFetchImagesForBatch(importData)}
                className="text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${autoSearchingBatch ? 'animate-spin' : ''}`} /> 
                Tìm lại tất cả ảnh
              </Button>

              <Button 
                onClick={handleConfirmImport} 
                disabled={loading || autoSearchingBatch} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                {loading ? 'Đang lưu CSDL...' : 'Xác nhận nhập vào Database'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="bg-slate-100 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-44">Hình ảnh</TableHead>
                    <TableHead className="min-w-[200px]">Tên sản phẩm</TableHead>
                    <TableHead className="w-44">Danh mục</TableHead>
                    <TableHead className="w-28">Giá bán (đ)</TableHead>
                    <TableHead className="w-28">Giá KM (đ)</TableHead>
                    <TableHead className="w-24">Tồn kho</TableHead>
                    <TableHead className="w-16 text-center">Xóa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((prod, idx) => (
                    <TableRow key={prod.tempId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Index */}
                      <TableCell className="text-center text-xs font-semibold text-slate-500">{idx + 1}</TableCell>

                      {/* Image Preview & Controls */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="relative w-12 h-12 rounded border bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden group">
                            {prod.image_url ? (
                              <img 
                                src={prod.image_url} 
                                alt={prod.name} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.png'
                                }}
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            )}
                          </div>

                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="text-[11px] h-6 px-2"
                              onClick={() => handleSearchImageForRow(prod)}
                            >
                              <Search className="w-3 h-3 mr-1" />
                              {prod.image_url ? 'Đổi ảnh' : 'Tìm ảnh'}
                            </Button>
                            
                            {prod.candidates && prod.candidates.length > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="text-[10px] h-5 px-1 text-blue-600 hover:text-blue-800 p-0"
                                onClick={() => setSelectedRowForImage(prod)}
                              >
                                {prod.candidates.length} gợi ý ảnh
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Product Name */}
                      <TableCell>
                        <Input
                          value={prod.name}
                          onChange={(e) => handleUpdateRow(prod.tempId, 'name', e.target.value)}
                          placeholder="Nhập tên sản phẩm..."
                          className="h-8 text-sm font-medium"
                        />
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <select
                          value={prod.category_id || ''}
                          onChange={(e) => handleUpdateRow(prod.tempId, 'category_id', e.target.value || null)}
                          className={`w-full h-8 px-2 border rounded-md text-xs font-medium bg-white focus:outline-none ${
                            !prod.category_id ? 'border-amber-400 text-amber-800 bg-amber-50' : 'border-slate-300'
                          }`}
                        >
                          <option value="">-- Chưa chọn danh mục --</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>

                      {/* Price */}
                      <TableCell>
                        <Input
                          type="number"
                          value={prod.price || 0}
                          onChange={(e) => handleUpdateRow(prod.tempId, 'price', Number(e.target.value))}
                          className="h-8 text-xs font-mono"
                        />
                      </TableCell>

                      {/* Sale Price */}
                      <TableCell>
                        <Input
                          type="number"
                          value={prod.sale_price ?? ''}
                          onChange={(e) => handleUpdateRow(prod.tempId, 'sale_price', e.target.value ? Number(e.target.value) : null)}
                          placeholder="Không KM"
                          className="h-8 text-xs font-mono"
                        />
                      </TableCell>

                      {/* Stock */}
                      <TableCell>
                        <Input
                          type="number"
                          value={prod.stock || 0}
                          onChange={(e) => handleUpdateRow(prod.tempId, 'stock', Number(e.target.value))}
                          className="h-8 text-xs font-mono"
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteRow(prod.tempId)}
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidate Selection Dialog for Individual Row */}
      {selectedRowForImage && (
        <Dialog open={!!selectedRowForImage} onOpenChange={(open) => { if (!open) setSelectedRowForImage(null) }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                Gợi ý hình ảnh cho: <span className="text-emerald-700">{selectedRowForImage.name}</span>
              </DialogTitle>
              <DialogDescription>
                Hệ thống tự động tìm và sắp xếp ảnh theo độ tương thích metadata. Bạn có thể chọn 1 ảnh bên dưới hoặc nhập link ảnh tùy chỉnh.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Manual URL input option */}
              <div className="space-y-1.5 border-b pb-3">
                <label className="text-xs font-semibold text-slate-700">Link URL hình ảnh thủ công:</label>
                <div className="flex gap-2">
                  <Input
                    value={selectedRowForImage.image_url || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      handleUpdateRow(selectedRowForImage.tempId, 'image_url', val)
                      setSelectedRowForImage(prev => prev ? { ...prev, image_url: val } : null)
                    }}
                    placeholder="https://images.pexels.com/..."
                    className="text-xs h-8"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={isSearchingSingleImage}
                    onClick={() => handleSearchImageForRow(selectedRowForImage)}
                  >
                    {isSearchingSingleImage ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                    Tìm lại ảnh khác
                  </Button>
                </div>
              </div>

              {/* Candidate Cards Grid */}
              {selectedRowForImage.candidates && selectedRowForImage.candidates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-auto p-1">
                  {selectedRowForImage.candidates.map((cand) => {
                    const isSelected = selectedRowForImage.image_url === cand.url
                    return (
                      <div
                        key={cand.id}
                        className={`border rounded-lg p-2.5 flex flex-col justify-between space-y-2 transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                            : 'bg-white hover:border-blue-400'
                        }`}
                      >
                        <div className="relative h-32 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                          <img
                            src={cand.thumbnailUrl || cand.url}
                            alt="Candidate"
                            className="max-h-full max-w-full object-contain"
                          />
                          {isSelected && (
                            <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow">
                              ✓ Đang chọn
                            </span>
                          )}
                        </div>

                        <div className="text-xs space-y-1">
                          <div className="flex justify-between text-slate-600">
                            <span>Điểm metadata:</span>
                            <span className="font-medium text-slate-900">{cand.metadataScore}/100</span>
                          </div>

                          {cand.sourcePageUrl && (
                            <a
                              href={cand.sourcePageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-slate-400 hover:underline flex items-center gap-1 truncate"
                            >
                              Nguồn: Pexels <ExternalLink className="w-2.5 h-2.5 inline" />
                            </a>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant={isSelected ? "secondary" : "outline"}
                          size="sm"
                          className={`w-full text-xs ${isSelected ? 'border-emerald-500 text-emerald-700 bg-emerald-100/60' : ''}`}
                          disabled={isSelected}
                          onClick={() => handleSelectCandidateInDialog(cand)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          {isSelected ? 'Đang sử dụng ảnh này' : 'Chọn ảnh này'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm">
                  {isSearchingSingleImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                      <span>Đang tìm kiếm hình ảnh phù hợp...</span>
                    </div>
                  ) : (
                    <span>Chưa có gợi ý hình ảnh nào. Ấn <strong>"Tìm lại ảnh khác"</strong> để hệ thống tìm kiếm.</span>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelectedRowForImage(null)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
