'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { generalSettingsSchema, GeneralSettingsFormData } from '@/schemas/setting.schema'
import { GeneralSettings } from '@/types/setting.type'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateGeneralSettingsAction } from '@/actions/admin/setting.actions'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Props {
  initialData: GeneralSettings
}

export function SettingForm({ initialData }: Props) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: initialData,
  })

  const onSubmit = async (data: GeneralSettingsFormData) => {
    setLoading(true)
    const result = await updateGeneralSettingsAction(data)
    setLoading(false)

    if (result.success) {
      toast.success('Lưu cài đặt thành công')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cài đặt hệ thống</h2>
          <p className="text-muted-foreground">
            Quản lý thông tin chung của website không cần can thiệp code.
          </p>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nhận diện thương hiệu</CardTitle>
            <CardDescription>Logo, tên và favicon hiển thị trên trình duyệt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="website_name">Tên website <span className="text-red-500">*</span></Label>
              <Input id="website_name" {...register('website_name')} />
              {errors.website_name && <span className="text-sm text-red-500">{errors.website_name.message}</span>}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="logo_url">Link Logo</Label>
              <Input id="logo_url" {...register('logo_url')} placeholder="https://..." />
              {watch('logo_url') && (
                <img src={watch('logo_url')} alt="Logo preview" className="h-12 object-contain bg-slate-100 rounded border p-2 mt-2" />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="favicon_url">Link Favicon (Icon tab)</Label>
              <Input id="favicon_url" {...register('favicon_url')} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin liên hệ</CardTitle>
            <CardDescription>Hiển thị ở footer hoặc trang liên hệ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Số điện thoại Hotline</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email hỗ trợ</Label>
              <Input id="email" {...register('email')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zalo">Link Zalo (hoặc SĐT Zalo)</Label>
              <Input id="zalo" {...register('zalo')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="facebook">Link Fanpage Facebook</Label>
              <Input id="facebook" {...register('facebook')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Địa chỉ cửa hàng</Label>
              <Input id="address" {...register('address')} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Nội dung bổ sung</CardTitle>
            <CardDescription>Footer và thông tin chuyển khoản</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="footer_text">Đoạn giới thiệu ngắn ở Footer</Label>
              <textarea 
                id="footer_text" 
                {...register('footer_text')} 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bank_info">Thông tin tài khoản ngân hàng (cho tính năng nạp tiền thủ công)</Label>
              <textarea 
                id="bank_info" 
                {...register('bank_info')} 
                placeholder="Ngân hàng ACB - Chi nhánh HCM&#10;STK: 123456789&#10;Chủ TK: NGUYEN VAN A"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
