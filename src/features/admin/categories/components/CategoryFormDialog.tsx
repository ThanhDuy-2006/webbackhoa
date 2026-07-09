'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema, CategoryFormData } from '@/schemas/category.schema'
import { Category } from '@/types/category.type'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { createCategoryAction, updateCategoryAction } from '@/actions/admin/category.actions'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Category | null
}

export function CategoryFormDialog({ open, onOpenChange, initialData }: Props) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      image_url: '',
      is_active: true,
    },
  })

  const isActive = watch('is_active')

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        slug: initialData.slug,
        description: initialData.description,
        image_url: initialData.image_url,
        is_active: initialData.is_active,
      })
    } else {
      reset({
        name: '',
        slug: '',
        description: '',
        image_url: '',
        is_active: true,
      })
    }
  }, [initialData, reset, open])

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

  const onSubmit = async (data: CategoryFormData) => {
    setLoading(true)
    let result
    if (initialData) {
      result = await updateCategoryAction(initialData.id, data)
    } else {
      result = await createCategoryAction(data)
    }

    setLoading(false)

    if (result.success) {
      toast.success(initialData ? 'Cập nhật danh mục thành công' : 'Thêm danh mục thành công')
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{initialData ? 'Sửa Danh Mục' : 'Thêm Danh Mục'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên danh mục <span className="text-red-500">*</span></Label>
              <Input id="name" {...register('name')} />
              {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="slug">Đường dẫn (Slug) <span className="text-red-500">*</span></Label>
              <Input id="slug" {...register('slug')} />
              {errors.slug && <span className="text-sm text-red-500">{errors.slug.message}</span>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Input id="description" {...register('description')} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image_url">Link ảnh</Label>
              <Input id="image_url" {...register('image_url')} />
              {errors.image_url && <span className="text-sm text-red-500">{errors.image_url.message}</span>}
            </div>

            <div className="flex items-center space-x-2 mt-2">
              <Checkbox 
                id="is_active" 
                checked={isActive} 
                onCheckedChange={(checked) => setValue('is_active', checked === true)} 
              />
              <Label htmlFor="is_active" className="cursor-pointer">Hiển thị danh mục này</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu lại'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
