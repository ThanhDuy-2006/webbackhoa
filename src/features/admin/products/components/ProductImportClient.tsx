'use client'

import { useState } from 'react'
import { Category } from '@/types/category.type'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { ProductFormData } from '@/schemas/product.schema'
import { bulkCreateProductsAction } from '@/actions/admin/product.actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'

interface Props {
  categories: Category[]
}

export function ProductImportClient({ categories }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [importData, setImportData] = useState<ProductFormData[]>([])
  const [rawText, setRawText] = useState('')

  const processData = (jsonData: any[]) => {
    const parsedProducts: ProductFormData[] = []

    jsonData.forEach((row: any) => {
      // Find category by name (case-insensitive)
      let category_id = null
      if (row['Danh mục']) {
        const cat = categories.find(c => c.name.toLowerCase() === String(row['Danh mục']).toLowerCase().trim())
        if (cat) category_id = cat.id
      }

      // Helper to parse price/stock that might contain formatting (e.g., "185,000 đ")
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

      if (row['Tên sản phẩm']) {
        parsedProducts.push({
          name: String(row['Tên sản phẩm']).trim(),
          slug: '', // Will be auto-generated
          category_id,
          description: row['Mô tả'] ? String(row['Mô tả']) : '',
          price,
          sale_price,
          stock,
          image_url: row['Hình ảnh'] ? String(row['Hình ảnh']) : null,
          images: row['Hình ảnh'] ? [String(row['Hình ảnh'])] : [],
          is_active: true,
          is_featured: false,
          variants: []
        })
      }
    })

    setImportData(parsedProducts)
    if (parsedProducts.length > 0) {
      toast.success(`Đã đọc được ${parsedProducts.length} sản phẩm hợp lệ`)
    } else {
      toast.error('Không tìm thấy sản phẩm nào hợp lệ trong dữ liệu')
    }
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
      // Read as tab-separated values (often from Excel copy/paste) or comma-separated
      const workbook = XLSX.read(rawText, { type: 'string' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)
      processData(jsonData)
    } catch (error) {
      toast.error('Định dạng văn bản không hợp lệ')
    }
  }

  const handleConfirmImport = async () => {
    if (importData.length === 0) return
    setLoading(true)

    const result = await bulkCreateProductsAction(importData)
    
    setLoading(false)
    if (result.success) {
      toast.success(`Thêm thành công ${result.results?.success} sản phẩm!`)
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
              <Upload className="w-5 h-5 text-emerald-600" /> Nhập từ file Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Tải lên file .xlsx hoặc .csv. Cấu trúc cột yêu cầu: Tên sản phẩm, Giá bán, Giá khuyến mãi, Tồn kho, Danh mục, Hình ảnh, Mô tả.
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
              className="w-full h-24 p-2 border rounded-md text-sm"
              placeholder="Tên sản phẩm&#9;Giá bán&#9;Tồn kho..."
            />
            <Button onClick={handleTextImport} variant="secondary" className="w-full">
              Phân tích Text
            </Button>
          </CardContent>
        </Card>
      </div>

      {importData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bảng xem trước dữ liệu ({importData.length} sản phẩm)</CardTitle>
            <Button onClick={handleConfirmImport} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {loading ? 'Đang xử lý...' : 'Xác nhận nhập dữ liệu'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Giá bán</TableHead>
                    <TableHead>Giá KM</TableHead>
                    <TableHead>Tồn kho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((prod, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{prod.name}</TableCell>
                      <TableCell>
                        {prod.category_id ? (
                          <span className="text-emerald-600 text-xs">Hợp lệ</span>
                        ) : (
                          <span className="text-amber-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Trống</span>
                        )}
                      </TableCell>
                      <TableCell>{prod.price.toLocaleString()}đ</TableCell>
                      <TableCell>{prod.sale_price ? prod.sale_price.toLocaleString() + 'đ' : '-'}</TableCell>
                      <TableCell>{prod.stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
