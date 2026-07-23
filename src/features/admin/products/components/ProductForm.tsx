'use client'

import { useState, useEffect, useRef } from 'react'
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
import { generateProductImageAction, selectManualCandidateAction } from '@/actions/admin/image.actions'
import { ImageCandidate, VisualVerificationStatus } from '@/lib/images/types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Loader2, RefreshCw, Sparkles, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'

interface Props {
  initialData?: Product | null
  categories: Category[]
}

export function ProductForm({ initialData, categories }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  
  // Candidates UI state
  const [candidateSessionId, setCandidateSessionId] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<ImageCandidate[]>([])
  const [verificationStatus, setVerificationStatus] = useState<VisualVerificationStatus | null>(null)
  const [selectingCandidateId, setSelectingCandidateId] = useState<string | null>(null)

  // Race condition & session tracking
  const requestIdRef = useRef<number>(0)
  const formSessionIdRef = useRef<string>(crypto.randomUUID())

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
      image_source: 'auto',
      image_status: 'unchecked',
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

  const images = watch('images')
  const name = watch('name')

  // Auto-generate slug from name if not editing
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

  // Auto-generate image from name (debounced with requestId race-condition guard)
  useEffect(() => {
    const currentImageUrl = watch('image_url')
    const imageSource = watch('image_source')
    
    if (name && name.length >= 2 && !currentImageUrl && imageSource !== 'manual') {
      const currentRequestId = ++requestIdRef.current

      const timer = setTimeout(async () => {
        setIsGeneratingImage(true)
        setImageError(null)
        try {
          const res = await generateProductImageAction(
            name, 
            initialData?.id, 
            formSessionIdRef.current, 
            false
          )

          // Race condition check: ignore response if a newer request was dispatched
          if (currentRequestId !== requestIdRef.current) return

          if (res.status === 'auto_selected' && res.url) {
            setValue('image_url', res.url, { shouldValidate: true })
            setValue('image_source', 'auto')
            setCandidates([])
            setCandidateSessionId(null)
          } else if (res.status === 'manual_selection_required') {
            setCandidateSessionId(res.candidateSessionId)
            setCandidates(res.candidates)
            setVerificationStatus(res.verificationStatus)
            setImageError(res.reason)

            if (res.candidates.length > 0) {
              setValue('image_url', res.candidates[0].url, { shouldValidate: true })
              setValue('image_source', 'auto')
            }
          } else if (res.status === 'not_found') {
            setCandidates([])
            setCandidateSessionId(null)
            setVerificationStatus(res.verificationStatus)
            setImageError(res.reason)
          } else if (res.status === 'error') {
            setImageError(res.message)
          }
        } catch (e) {
          console.error(e)
        } finally {
          if (currentRequestId === requestIdRef.current) {
            setIsGeneratingImage(false)
          }
        }
      }, 800)
      
      return () => clearTimeout(timer)
    }
  }, [name, initialData, setValue, watch])

  const handleManualImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('image_url', e.target.value)
    setValue('image_source', 'manual')
    setCandidates([])
    setCandidateSessionId(null)
  }

  const handleGenerateImage = async (bypassCache: boolean = false) => {
    if (!name || name.length < 2) {
      toast.error('Vui lòng nhập tên sản phẩm trước (ít nhất 2 ký tự)')
      return
    }

    const currentRequestId = ++requestIdRef.current
    setIsGeneratingImage(true)
    setImageError(null)

    try {
      const currentUrl = watch('image_url')
      const excludeUrl = bypassCache && currentUrl ? currentUrl : undefined

      const res = await generateProductImageAction(
        name,
        initialData?.id,
        formSessionIdRef.current,
        bypassCache,
        excludeUrl,
        candidateSessionId
      )

      if (currentRequestId !== requestIdRef.current) return

      if (res.status === 'auto_selected' && res.url) {
        setValue('image_url', res.url, { shouldValidate: true })
        setValue('image_source', 'auto')
        setCandidates([])
        setCandidateSessionId(null)
        toast.success('Đã tự động chọn ảnh phù hợp nhất')
      } else if (res.status === 'manual_selection_required') {
        setCandidateSessionId(res.candidateSessionId)
        setCandidates(res.candidates)
        setVerificationStatus(res.verificationStatus)
        setImageError(res.reason)

        if (res.candidates.length > 0) {
          setValue('image_url', res.candidates[0].url, { shouldValidate: true })
          setValue('image_source', 'auto')
          toast.success(`Đã tự động chọn ảnh có điểm cao nhất (${res.candidates[0].metadataScore}/100)`)
        } else {
          toast.info('Vui lòng chọn 1 trong các ảnh gợi ý bên dưới')
        }
      } else if (res.status === 'not_found') {
        setCandidates([])
        setCandidateSessionId(null)
        setVerificationStatus(res.verificationStatus)
        setImageError(res.reason)
        toast.error(res.reason)
      } else if (res.status === 'error') {
        setImageError(res.message)
        toast.error(res.message)
      }
    } catch (e) {
      toast.error('Lỗi khi tạo ảnh')
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsGeneratingImage(false)
      }
    }
  }

  const handleSelectCandidate = async (candidate: ImageCandidate) => {
    if (!candidateSessionId) return
    setSelectingCandidateId(candidate.id)

    try {
      const res = await selectManualCandidateAction({
        productId: initialData?.id,
        formSessionId: formSessionIdRef.current,
        candidateSessionId,
        candidateId: candidate.id,
        expectedImageUrl: watch('image_url') || null,
        expectedUpdatedAt: initialData?.updated_at || null,
      })

      if (res.success && res.url) {
        setValue('image_url', res.url, { shouldValidate: true })
        setValue('image_source', 'manual')
        toast.success('Đã chọn hình ảnh sản phẩm')
      } else {
        toast.error(res.error || 'Không thể chọn ảnh này')
      }
    } catch (e) {
      toast.error('Lỗi khi xác nhận chọn ảnh')
    } finally {
      setSelectingCandidateId(null)
    }
  }

  const handleRefreshPreview = () => {
    // Refresh preview without calling external search or vision API
    const current = watch('image_url')
    if (current) {
      setValue('image_url', '')
      setTimeout(() => setValue('image_url', current), 50)
    }
  }

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
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="image_url">Ảnh đại diện (URL)</Label>
                  {watch('image_source') === 'auto' && watch('image_url') && (
                    <span className="text-xs text-emerald-600 font-medium px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      Ảnh tự động
                    </span>
                  )}
                  {watch('image_source') === 'manual' && watch('image_url') && (
                    <span className="text-xs text-blue-600 font-medium px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                      Ảnh thủ công
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Input 
                    id="image_url" 
                    {...register('image_url')} 
                    onChange={handleManualImageChange}
                    placeholder="https://..." 
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleGenerateImage(true)}
                    disabled={isGeneratingImage || !name}
                    title="Thử tìm lại ảnh tự động (Bỏ qua cache)"
                  >
                    {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
                {imageError && <span className="text-sm text-amber-600 mt-1 block">{imageError}</span>}
                
                <div className="relative mt-2 min-h-[8rem] border rounded bg-slate-50 flex items-center justify-center overflow-hidden">
                  {isGeneratingImage ? (
                    <div className="flex flex-col items-center text-slate-400 p-4">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      <span className="text-sm">Đang tìm kiếm ảnh...</span>
                    </div>
                  ) : watch('image_url') ? (
                    <div className="relative w-full group">
                      <img 
                        src={watch('image_url') || ''} 
                        alt="Preview" 
                        className="w-full max-h-48 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png'
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        className="absolute top-2 right-2 opacity-80 hover:opacity-100"
                        onClick={handleRefreshPreview}
                        title="Làm mới ảnh xem trước"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Làm mới xem trước
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 p-4">
                      <span className="text-sm">Chưa có ảnh</span>
                      <Button type="button" variant="link" onClick={() => handleGenerateImage(false)} className="mt-1 h-auto p-0">
                        Tự động tìm ảnh
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Selection Candidate Grid */}
              {candidates.length > 0 && (
                <div className="mt-4 border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-slate-800">Gợi ý hình ảnh (Top {candidates.length}):</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleGenerateImage(true)}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Thử tìm lại
                    </Button>
                  </div>

                  {verificationStatus === 'not_available' && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>Chưa cấu hình kiểm tra hình ảnh bằng AI. Vui lòng chọn ảnh thủ công bên dưới.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {candidates.map((cand) => {
                      const isSelected = watch('image_url') === cand.url
                      return (
                        <div
                          key={cand.id}
                          className={`border rounded-md p-2 flex flex-col justify-between space-y-2 transition ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                              : 'bg-white hover:border-blue-400'
                          }`}
                        >
                          <div className="relative h-28 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                            <img
                              src={cand.thumbnailUrl || cand.url}
                              alt="Candidate"
                              className="max-h-full max-w-full object-contain"
                            />
                            {isSelected && (
                              <span className="absolute top-1 right-1 bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow">
                                ✓ Đang chọn
                              </span>
                            )}
                          </div>

                          <div className="text-xs space-y-1">
                            <div className="flex justify-between text-slate-600">
                              <span>Điểm metadata:</span>
                              <span className="font-medium">{cand.metadataScore}/100</span>
                            </div>

                            {cand.visualScore !== undefined && (
                              <div className="flex justify-between text-blue-600">
                                <span>Độ phù hợp do AI đánh giá:</span>
                                <span className="font-semibold">{cand.visualScore}/100</span>
                              </div>
                            )}

                            {cand.sourcePageUrl && (
                              <a
                                href={cand.sourcePageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-slate-400 hover:underline flex items-center gap-1 truncate max-w-full"
                              >
                                Nguồn: Pexels <ExternalLink className="w-2.5 h-2.5 inline" />
                              </a>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant={isSelected ? "secondary" : "outline"}
                            size="sm"
                            className={`w-full text-xs ${isSelected ? 'border-emerald-500 text-emerald-700 bg-emerald-100/50' : ''}`}
                            disabled={selectingCandidateId === cand.id || isSelected}
                            onClick={() => handleSelectCandidate(cand)}
                          >
                            {selectingCandidateId === cand.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : isSelected ? (
                              <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                            ) : (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            )}
                            {isSelected ? 'Đang sử dụng' : 'Chọn ảnh này'}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              
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
