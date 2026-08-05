'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Upload, Plus, Trash2, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Category } from '@/types/category.type'
import { Product } from '@/types/product.type'
import { sellerProductSchema, SellerProductInput } from '@/schemas/seller-product.schema'
import { createSellerProductAction, updateSellerProductAction } from '@/actions/seller-product.actions'
import { uploadSellerProductImage } from '@/lib/storage/seller-image-upload'
import { searchPexelsImagesPublicAction } from '@/actions/product-public.actions'
import { SmartImage } from '@/components/ui/smart-image'
import { toast } from 'sonner'

interface SellerProductFormProps {
  categories: Category[]
  initialData?: Product | null
}

export function SellerProductForm({ categories, initialData }: SellerProductFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [autoSearchingImage, setAutoSearchingImage] = useState(false)
  const [priceMode, setPriceMode] = useState<'unit' | 'total'>('unit')

  const isEdit = Boolean(initialData)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(sellerProductSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      category_id: initialData?.category_id || (categories[0]?.id || ''),
      price: initialData?.price || ('' as any),
      sale_price: initialData?.sale_price || null,
      stock: initialData?.stock ?? ('' as any),
      image_url: initialData?.image_url || '',
      images: initialData?.images || [],
      listing_status: (initialData?.listing_status as any) || 'active',
      variants: initialData?.variants?.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku || '',
        price: v.price || null,
        stock: v.stock,
        is_active: v.is_active,
      })) || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  })

  const currentImageUrl = watch('image_url')
  const productName = watch('name')

  // Direct Supabase Storage File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const res = await uploadSellerProductImage(file)
      if (res.success && res.url) {
        setValue('image_url', res.url, { shouldValidate: true })
        toast.success('Đã tải ảnh sản phẩm lên thành công!')
      } else {
        toast.error(res.error || 'Lỗi tải ảnh')
      }
    } finally {
      setUploadingImage(false)
    }
  }

  // Optional Pexels Auto Image Generator
  const handleAutoSearchImage = async () => {
    if (!productName || productName.trim().length < 2) {
      toast.error('Vui lòng nhập tên sản phẩm trước khi tìm ảnh tự động')
      return
    }

    setAutoSearchingImage(true)
    try {
      const pexelsUrl = await searchPexelsImagesPublicAction(productName)
      if (pexelsUrl) {
        setValue('image_url', pexelsUrl, { shouldValidate: true })
        toast.success('Đã tự động tìm được hình ảnh phù hợp!')
      } else {
        toast.error('Không tìm thấy ảnh tự động phù hợp. Vui lòng tải ảnh thủ công.')
      }
    } catch {
      toast.error('Lỗi khi tự động tìm ảnh')
    } finally {
      setAutoSearchingImage(false)
    }
  }

  // Auto-fetch image when product name changes (debounced)
  useEffect(() => {
    if (!productName || productName.trim().length < 2) return
    
    // Only auto-fetch if there's no image or if the current image is already from Pexels
    // This prevents overwriting a manually uploaded image
    if (currentImageUrl && !currentImageUrl.includes('pexels.com')) return

    const timer = setTimeout(async () => {
      setAutoSearchingImage(true)
      try {
        const pexelsUrl = await searchPexelsImagesPublicAction(productName)
        if (pexelsUrl) {
          setValue('image_url', pexelsUrl, { shouldValidate: true })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setAutoSearchingImage(false)
      }
    }, 1000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productName, setValue])

  const onSubmit = async (data: SellerProductInput) => {
    setSubmitting(true)
    try {
      const submissionData = { ...data }
      if (priceMode === 'total' && submissionData.stock > 0) {
        submissionData.price = Math.round(submissionData.price / submissionData.stock)
        if (submissionData.sale_price) {
          submissionData.sale_price = Math.round(submissionData.sale_price / submissionData.stock)
        }
      }

      if (isEdit && initialData) {
        const res = await updateSellerProductAction(initialData.id, submissionData)
        if (res.success) {
          toast.success('Đã cập nhật sản phẩm thành công!')
          router.push('/tai-khoan/san-pham-cua-toi')
          router.refresh()
        } else {
          toast.error(res.error || 'Không thể cập nhật sản phẩm')
        }
      } else {
        const res = await createSellerProductAction(submissionData)
        if (res.success) {
          toast.success('Đã đăng bán sản phẩm thành công!')
          router.push('/tai-khoan/san-pham-cua-toi')
          router.refresh()
        } else {
          toast.error(res.error || 'Không thể đăng bán sản phẩm')
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/tai-khoan/san-pham-cua-toi">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isEdit ? 'Chỉnh sửa sản phẩm đăng bán' : 'Đăng bán sản phẩm mới'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Sản phẩm của bạn sẽ xuất hiện công khai trên sàn ngay lập tức</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Thông tin cơ bản</h2>

          <div className="space-y-2">
            <Label htmlFor="name" className="font-semibold text-slate-700">Tên sản phẩm *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="VD: Tai nghe Bluetooth không dây Chống ồn"
              className="rounded-xl"
            />
            {errors.name?.message && <p className="text-xs text-rose-600 font-medium">{String(errors.name.message)}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id" className="font-semibold text-slate-700">Danh mục sản phẩm *</Label>
              <select
                id="category_id"
                {...register('category_id')}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.category_id?.message && <p className="text-xs text-rose-600 font-medium">{String(errors.category_id.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing_status" className="font-semibold text-slate-700">Trạng thái đăng bán</Label>
              <select
                id="listing_status"
                {...register('listing_status')}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="active">Đang bán (Công khai ngay)</option>
                <option value="paused">Tạm dừng bán</option>
                <option value="draft">Bản nháp</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-semibold text-slate-700">Mô tả sản phẩm</Label>
            <Textarea
              id="description"
              {...register('description')}
              rows={4}
              placeholder="Nhập chi tiết về tình trạng sản phẩm, xuất xứ, tính năng nổi bật..."
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Pricing & Stock Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Giá bán & Tồn kho</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-3 mb-2 flex gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="priceMode" value="unit" checked={priceMode === 'unit'} onChange={() => setPriceMode('unit')} className="text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                <span className="font-semibold text-slate-700">Giá bán 1 sản phẩm (Giá gốc)</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="priceMode" value="total" checked={priceMode === 'total'} onChange={() => setPriceMode('total')} className="text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                <span className="font-semibold text-slate-700">Tổng giá lô hàng (Giá chia)</span>
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="font-semibold text-slate-700">
                {priceMode === 'unit' ? 'Giá bán (VNĐ) *' : 'Tổng giá bán (VNĐ) *'}
              </Label>
              <Controller
                control={control}
                name="price"
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <Input
                    id="price"
                    type="text"
                    placeholder="100.000"
                    className="rounded-xl"
                    value={value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, '')
                      if (/^\d*$/.test(rawValue)) {
                        onChange(rawValue ? Number(rawValue) : undefined)
                      }
                    }}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
              {errors.price?.message && <p className="text-xs text-rose-600 font-medium">{String(errors.price.message)}</p>}
              {priceMode === 'total' && Number(watch('price')) > 0 && Number(watch('stock')) > 0 && (
                <p className="text-xs text-blue-600 font-medium">
                  =&gt; Giá 1 SP: <span className="font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(watch('price')) / Number(watch('stock')))}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sale_price" className="font-semibold text-slate-700">
                {priceMode === 'unit' ? 'Giá khuyến mãi (Nếu có)' : 'Tổng KM (Nếu có)'}
              </Label>
              <Controller
                control={control}
                name="sale_price"
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <Input
                    id="sale_price"
                    type="text"
                    placeholder="80.000"
                    className="rounded-xl"
                    value={value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, '')
                      if (/^\d*$/.test(rawValue)) {
                        onChange(rawValue ? Number(rawValue) : null)
                      }
                    }}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
              {errors.sale_price?.message && <p className="text-xs text-rose-600 font-medium">{String(errors.sale_price.message)}</p>}
              {priceMode === 'total' && watch('sale_price') > 0 && watch('stock') > 0 && (
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  =&gt; KM 1 SP: <span className="font-bold">{new Intl.NumberFormat('vi-VN').format(Math.round(watch('sale_price') / watch('stock')))}đ</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock" className="font-semibold text-slate-700">Số lượng tồn kho *</Label>
              <Input
                id="stock"
                type="number"
                {...register('stock', { setValueAs: v => v === '' ? undefined : Number(v) })}
                placeholder="10"
                className="rounded-xl"
              />
              {errors.stock?.message && <p className="text-xs text-rose-600 font-medium">{String(errors.stock.message)}</p>}
            </div>
          </div>
        </div>

        {/* Image Upload Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Hình ảnh sản phẩm</h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-32 h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden relative shrink-0 flex items-center justify-center">
              {currentImageUrl ? (
                <SmartImage src={currentImageUrl} alt="Xem trước ảnh" fill className="object-cover" />
              ) : (
                <div className="text-center p-3">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                  <span className="text-[10px] text-slate-400 mt-1 block">Chưa có ảnh</span>
                </div>
              )}
            </div>

            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all">
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải ảnh...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" /> Tải ảnh thực tế từ thiết bị
                    </>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="hidden" disabled={uploadingImage} />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoSearchImage}
                  disabled={autoSearchingImage}
                  className="rounded-xl text-xs"
                >
                  {autoSearchingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tìm ảnh...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-amber-500" /> Tự động gán ảnh Pexels
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-slate-500">Chấp nhận ảnh JPG, PNG, WEBP tối đa 5MB. Ảnh sẽ được tự động bảo mật qua Supabase Storage.</p>
              
              <Input
                {...register('image_url')}
                placeholder="Hoặc dán URL đường dẫn ảnh trực tiếp..."
                className="rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Variants Card (Optional) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Phân loại sản phẩm (Tùy chọn)</h2>
              <p className="text-xs text-slate-500">Thêm biến thể như Size, Màu sắc, Dung lượng...</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', price: null, stock: 10, is_active: true })}
              className="rounded-xl text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Thêm biến thể
            </Button>
          </div>

          {fields.length > 0 && (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="flex-1 min-w-[150px]">
                    <Input
                      {...register(`variants.${index}.name`)}
                      placeholder="VD: Màu Đen / Size L"
                      className="rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div className="w-28">
                    <Controller
                      control={control}
                      name={`variants.${index}.price`}
                      render={({ field: { onChange, onBlur, value, ref } }) => (
                        <Input
                          type="text"
                          placeholder="Giá riêng"
                          className="rounded-lg text-xs bg-white"
                          value={value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ''}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/\./g, '')
                            if (/^\d*$/.test(rawValue)) {
                              onChange(rawValue ? Number(rawValue) : null)
                            }
                          }}
                          onBlur={onBlur}
                          ref={ref}
                        />
                      )}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      {...register(`variants.${index}.stock`, { valueAsNumber: true })}
                      placeholder="Tồn kho"
                      className="rounded-lg text-xs bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/tai-khoan/san-pham-cua-toi">
            <Button type="button" variant="outline" className="rounded-xl">Hủy bỏ</Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8 shadow-md shadow-emerald-600/20"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...
              </>
            ) : isEdit ? (
              'Cập nhật sản phẩm'
            ) : (
              'Xác nhận đăng bán ngay'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
