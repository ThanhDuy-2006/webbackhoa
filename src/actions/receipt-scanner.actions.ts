'use server'

import { GoogleGenAI } from '@google/genai'
import { createAdminClient } from '@/lib/supabase/admin'
import { addDaysFromNow } from '@/lib/expiry-utils'
import { assertAuthenticatedUser } from '@/lib/supabase/auth-guard'

export interface ScannedReceiptItem {
  tempId: string
  name: string
  price: number
  sale_price?: number | null
  stock: number
  category_id?: string | null
  category_name?: string | null
  expiry_date?: string | null
  description?: string
  confidence?: number
}

export interface ScanReceiptResult {
  success: boolean
  error?: string
  merchantName?: string
  totalBill?: number
  items?: ScannedReceiptItem[]
}

function parseVietnameseNumber(val: any): number {
  if (typeof val === 'number') return Math.round(val)
  if (!val) return 0
  let str = String(val).trim().toLowerCase().replace(/đ|vnd|vnđ/g, '').trim()
  // If number formatted like "4.200" or "21.000" or "74.250"
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '')
  } else if (/^\d{1,3}(,\d{3})+$/.test(str)) {
    str = str.replace(/,/g, '')
  } else if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.')
    if (parts.length === 2 && parts[1].length === 3) {
      str = parts[0] + parts[1]
    }
  }
  const cleanNum = parseFloat(str.replace(/[^\d.-]/g, ''))
  return isNaN(cleanNum) ? 0 : Math.round(cleanNum)
}

export async function scanReceiptAction(base64ImageWithHeader: string): Promise<ScanReceiptResult> {
  try {
    await assertAuthenticatedUser()

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return {
        success: false,
        error: 'Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm GEMINI_API_KEY vào file .env.local để sử dụng tính năng quét hóa đơn bằng AI.'
      }
    }

    if (!base64ImageWithHeader || !base64ImageWithHeader.includes(',')) {
      return {
        success: false,
        error: 'Dữ liệu ảnh hóa đơn không hợp lệ.'
      }
    }

    // Extract mimeType and raw base64
    const parts = base64ImageWithHeader.split(',')
    const mimeMatch = parts[0].match(/:(.*?);/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const base64Data = parts[1]

    // Fetch existing categories to map
    const supabase = createAdminClient()
    const { data: categories } = await supabase.from('categories').select('id, name, slug')
    const categoryListStr = categories?.map(c => `- ${c.name} (slug: ${c.slug}, id: ${c.id})`).join('\n') || ''

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `
Bạn là chuyên gia OCR bóc tách hóa đơn, phiếu mua hàng siêu thị, bách hóa, chợ tại Việt Nam (Bách Hóa Xanh, WinMart, Co.opmart, Tops Market, Lotte Mart, Ministop, Circle K, hóa đơn tạp hóa).

Nhiệm vụ:
1. Đọc và nhận diện toàn bộ danh sách sản phẩm/hàng hóa trong ảnh hóa đơn.

LƯU Ý CỰC KỲ QUAN TRỌNG VỀ GIÁ TIỀN & THÀNH TIỀN (BẮT BUỘC TUÂN THỦ):
- Trên hóa đơn (ví dụ Bách Hóa Xanh, WinMart), nhiều sản phẩm có 2 mức giá: Mức giá gốc in gạch bỏ (ví dụ: 9.000, 10.000, 14.500) và Mức giá khuyến mãi / giá bán thực tế sau khi giảm (ví dụ: 6.667, 7.500, 7.250).
- Cột "Thành tiền" ở ngoài cùng bên phải là số tiền thực tế phải trả (ví dụ: 3 nấm = 20.000đ, 1 rau muống = 7.500đ, 1 ổi = 7.250đ).
- BẠN BẮT BUỘC PHẢI LẤY ĐÚNG GIÁ THỰC TẾ ĐÃ GIẢM (sau khuyến mãi / sau khi gạch bỏ) hoặc tính: đơn giá = Thành tiền / Số lượng. TUYỆT ĐỐI KHÔNG ĐƯỢC LẤY GIÁ GỐC BỊ GẠCH BỎ!
- Với từng sản phẩm:
   - "name": Tên chuẩn tiếng Việt, có dấu rõ ràng (bỏ các mã vạch số hoặc ký tự rác nếu có, ví dụ: "Rau muống hạt gói 400g", "Nấm kim châm TQ 150g", "Ổi Đài Loan", "Lẩu thái Cholimex chai 280g").
   - "stock": Số lượng mua dạng số nguyên (ví dụ: 1, 2, 3...; nếu 0.5kg hoặc đơn vị lẻ thì làm tròn số nguyên tối thiểu là 1).
   - "price": Đơn giá thực tế sau khi giảm của 1 đơn vị sản phẩm (dạng SỐ NGUYÊN VNĐ KHÔNG DẤU CHẤM. Ví dụ: rau muống là 7500 chứ KHÔNG PHẢI 10000; nấm là 6667 chứ KHÔNG PHẢI 9000; ổi là 7250 chứ KHÔNG PHẢI 14500; lẩu thái là 21000; ngò gai là 4200).
   - "original_price": Giá gốc ban đầu nếu trên hóa đơn có in gạch bỏ (số nguyên VNĐ), nếu không có thì để null.
   - "category_slug": Danh mục phù hợp nhất từ danh sách sau:
${categoryListStr}
   - "expiry_days_estimate": Ước lượng số ngày sử dụng tốt nhất cho loại thực phẩm này kể từ ngày mua:
     + Rau củ quả tươi sống: 3-5 ngày (vd: 4)
     + Thịt, cá, hải sản tươi: 2-3 ngày (vd: 2)
     + Trái cây tươi: 4-7 ngày (vd: 5)
     + Sữa tươi, bánh tươi, đậu hũ: 5-10 ngày (vd: 7)
     + Thực phẩm khô, mì, gia vị, dầu ăn, gạo: 90-180 ngày (vd: 120)
     + Nước ngọt, bia, đồ hộp: 90-365 ngày (vd: 180)
     + Hóa mỹ phẩm, đồ gia dụng: 365 ngày (vd: 365)
     + Khác: 30 ngày

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng sau (không bao gồm markdown hay chú thích thừa):
{
  "merchant": "BÁCH HÓA XANH",
  "total_bill": 74250,
  "items": [
    {
      "name": "Rau muống hạt gói 400g",
      "stock": 1,
      "price": 7500,
      "original_price": 10000,
      "category_slug": "rau-cu-qua",
      "expiry_days_estimate": 4
    }
  ]
}
`

    const candidateModels = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash']
    let text = ''
    let lastError: any = null

    for (const modelName of candidateModels) {
      try {
        const res = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                  }
                },
                {
                  text: prompt
                }
              ]
            }
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          }
        })
        if (res.text) {
          text = res.text
          break
        }
      } catch (e: any) {
        console.warn(`Model ${modelName} failed, trying next candidate:`, e?.message)
        lastError = e
      }
    }

    if (!text) {
      if (lastError) throw lastError
      return {
        success: false,
        error: 'AI không đọc được nội dung từ ảnh hóa đơn. Vui lòng chụp rõ nét hơn.'
      }
    }

    const cleanJson = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
    const parsed = JSON.parse(cleanJson)

    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return {
        success: false,
        error: 'Không tìm thấy dòng sản phẩm nào trong ảnh hóa đơn.'
      }
    }

    const scannedItems: ScannedReceiptItem[] = parsed.items.map((item: any, idx: number) => {
      // Find matching category ID
      let matchedCategory = categories?.find(c => c.slug === item.category_slug)
      if (!matchedCategory && item.category_slug) {
        matchedCategory = categories?.find(c => c.name.toLowerCase().includes(item.category_slug.toLowerCase()))
      }

      const daysEstimate = typeof item.expiry_days_estimate === 'number' && item.expiry_days_estimate > 0 
        ? item.expiry_days_estimate 
        : 7
      
      const calculatedExpiryDate = addDaysFromNow(daysEstimate)

      return {
        tempId: `scanned-${idx}-${Date.now()}`,
        name: String(item.name || '').trim(),
        price: parseVietnameseNumber(item.price),
        sale_price: null,
        stock: parseVietnameseNumber(item.stock) > 0 ? parseVietnameseNumber(item.stock) : 1,
        category_id: matchedCategory ? matchedCategory.id : (categories && categories.length > 0 ? categories[0].id : null),
        category_name: matchedCategory ? matchedCategory.name : null,
        expiry_date: calculatedExpiryDate,
        description: `Nhập tự động từ hóa đơn ${parsed.merchant || ''}`,
      }
    })

    return {
      success: true,
      merchantName: parsed.merchant,
      totalBill: parseVietnameseNumber(parsed.total_bill),
      items: scannedItems,
    }
  } catch (err: unknown) {
    const error = err as Error
    console.error('Scan Receipt Error:', error)
    return {
      success: false,
      error: error.message || 'Lỗi khi quét hóa đơn bằng AI.'
    }
  }
}
