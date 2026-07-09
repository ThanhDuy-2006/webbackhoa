'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, ProductFormData } from '@/schemas/product.schema'
import { Product } from '@/types/product.type'
import { Category } from '@/types/category.type'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { createProductAction, updateProductAction } from '@/actions/admin/product.actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  initialData?: Product | null
  categories: Category[]
}

export function ProductForm({ initialData, categories }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: initialData ? {
      ...initialData,
      variants: initialData.variants || [],
      images: initialData.images || []
    } : {
      name: '',
      slug: '',
      category_id: '',
      description: '',
      price: 0,
      sale_price: null,
      stock: 0,
      image_url: '',
      images: [],
      is_active: true,
      is_featured: false,
      variants: []
    },
  })

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: "variants"
  })

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control,
    name: "images" as never // field array with strings is tricky, we'll manage array directly
  })
  
  const images = watch('images')

  // Auto-generate slug from name if not editing
  const name = watch('name')
  useEffect(() => {
    if (!initialData && name) {
      const generatedSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
      setValue('slug', generatedSlug)
    }
  }, [name, initialData, setValue])

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true)
    let result
    if (initialData) {
      result = await updateProductAction(initialData.id, data)
    } else {
      result = await createProductAction(data)
    }

    setLoading(false)

    if (result.success) {
      toast.success(initialData ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm thành công')
      router.push('/admin/products')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{initialData ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
        <div className="space-x-2">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/products')} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu lại'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Tên sản phẩm <span className="text-red-500">*</span></Label>
                <Input id="name" {...register('name')} />
                {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="slug">Đường dẫn (Slug)</Label>
                <Input id="slug" {...register('slug')} placeholder="Để trống hệ thống sẽ tự động tạo" />
                {errors.slug && <span className="text-sm text-red-500">{errors.slug.message}</span>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Mô tả</Label>
                <textarea 
                  id="description" 
                  {...register('description')} 
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Giá và Kho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Giá bán (VNĐ) <span className="text-red-500">*</span></Label>
                  <Input id="price" type="number" {...register('price')} />
                  {errors.price && <span className="text-sm text-red-500">{errors.price.message}</span>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sale_price">Giá khuyến mãi (VNĐ)</Label>
                  <Input id="sale_price" type="number" {...register('sale_price')} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stock">Tồn kho chung (Nếu không dùng phân loại) <span className="text-red-500">*</span></Label>
                <Input id="stock" type="number" {...register('stock')} />
                {errors.stock && <span className="text-sm text-red-500">{errors.stock.message}</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Phân loại sản phẩm (Tùy chọn)</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => appendVariant({ name: '', stock: 0, is_active: true })}>
                <Plus className="h-4 w-4 mr-2" /> Thêm phân loại
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {variantFields.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4 border rounded-md border-dashed">
                  Sản phẩm này không có phân loại (ví dụ: màu sắc, dung lượng).
                </div>
              ) : (
                <div className="space-y-4">
                  {variantFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start border p-4 rounded-md relative bg-slate-50">
                      <div className="grid grid-cols-2 gap-4 flex-1">
                        <div className="grid gap-2">
                          <Label>Tên phân loại (vd: Đen 256GB)</Label>
                          <Input {...register(`variants.${index}.name` as const)} />
                          {errors.variants?.[index]?.name && <span className="text-sm text-red-500">{errors.variants[index]?.name?.message}</span>}
                        </div>
                        <div className="grid gap-2">
                          <Label>Mã SKU</Label>
                          <Input {...register(`variants.${index}.sku` as const)} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Giá riêng (Bỏ trống = Giá chung)</Label>
                          <Input type="number" {...register(`variants.${index}.price` as const)} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Tồn kho</Label>
                          <Input type="number" {...register(`variants.${index}.stock` as const)} />
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(index)} className="text-red-500 mt-6">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Danh mục & Trạng thái</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Danh mục sản phẩm</Label>
                <select 
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('category_id')}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.category_id && <span className="text-sm text-red-500">{errors.category_id.message}</span>}
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Checkbox 
                  id="is_active" 
                  checked={watch('is_active')} 
                  onCheckedChange={(checked) => setValue('is_active', checked === true)} 
                />
                <Label htmlFor="is_active" className="cursor-pointer">Hiển thị sản phẩm</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="is_featured" 
                  checked={watch('is_featured')} 
                  onCheckedChange={(checked) => setValue('is_featured', checked === true)} 
                />
                <Label htmlFor="is_featured" className="cursor-pointer font-medium text-emerald-600">Sản phẩm nổi bật</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hình ảnh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="image_url">Ảnh đại diện (URL)</Label>
                <Input id="image_url" {...register('image_url')} placeholder="https://..." />
                {watch('image_url') && (
                  <img src={watch('image_url') || ''} alt="Preview" className="w-full h-32 object-contain mt-2 rounded border" />
                )}
              </div>
              
              <div className="border-t pt-4">
                <Label className="mb-2 block">Thư viện ảnh (Nhiều ảnh)</Label>
                <div className="space-y-2">
                  {(images || []).map((img, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input 
                        value={img} 
                        onChange={(e) => {
                          const newImages = [...(images || [])]
                          newImages[idx] = e.target.value
                          setValue('images', newImages)
                        }} 
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => {
                        setValue('images', (images || []).filter((_, i) => i !== idx))
                      }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setValue('images', [...(images || []), ''])}>
                    <Plus className="h-4 w-4 mr-2" /> Thêm ảnh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
