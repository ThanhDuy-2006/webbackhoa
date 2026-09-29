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
Bạn là chuyên gia OCR bóc tách thông tin hóa đơn, phiếu mua hàng và đơn hàng mua sắm tại Việt Nam (Bách Hóa Xanh, WinMart, Co.opmart, Tops Market, Lotte Mart, Ministop, Circle K, tạp hóa, và ảnh chụp màn hình ứng dụng mua sắm online như BHX online, Shopee, GrabMart).

Nhiệm vụ:
1. Đọc và nhận diện toàn bộ danh sách sản phẩm/hàng hóa hiển thị trong ảnh (kể cả hóa đơn giấy, phiếu thu in nhiệt hoặc màn hình chi tiết đơn hàng trên điện thoại).

LƯU Ý CỰC KỲ QUAN TRỌNG VỀ GIÁ TIỀN & THÀNH TIỀN (BẮT BUỘC TUÂN THỦ):
- Trên hóa đơn/ứng dụng, nhiều sản phẩm có 2 mức giá: Mức giá gốc in gạch bỏ hoặc giá thị trường (ví dụ: 14.000, 29.400, 150.000) và Mức giá khuyến mãi / giá bán thực tế sau khi giảm (ví dụ: 7.000, 112.000, 9.950).
- Cột "Thành tiền" hoặc "Giá bán" là số tiền thực tế phải trả.
- BẠN BẮT BUỘC PHẢI LẤY ĐÚNG GIÁ THỰC TẾ ĐÃ GIẢM (sau khuyến mãi) của 1 đơn vị sản phẩm.
- Với từng sản phẩm:
   - "name": Tên chuẩn tiếng Việt, có dấu rõ ràng (ví dụ: "Bánh xốp ống nhân kem socola Jojo gói 100g", "Thùng 30 gói mì 3 Miền Gold cay 3 cấp độ gói 75g", "Chuối già giống Nam Mỹ", "Giá mầm sạch gói 300g").
   - "stock": Số lượng mua dạng số nguyên (ví dụ: 1, 2, 3...; nếu 0.5kg hoặc đơn vị lẻ thì làm tròn số nguyên tối thiểu là 1).
   - "price": Đơn giá thực tế của 1 đơn vị sản phẩm (dạng SỐ NGUYÊN VNĐ KHÔNG DẤU CHẤM. Ví dụ: 7000, 112000, 9950, 7500).
   - "original_price": Giá gốc ban đầu nếu trên hóa đơn có in gạch bỏ (số nguyên VNĐ), nếu không có thì để null.
   - "category_slug": Danh mục phù hợp nhất từ danh sách sau:
${categoryListStr}
   - "expiry_days_estimate": Ước lượng số ngày sử dụng tốt nhất cho loại thực phẩm này kể từ ngày mua:
     + Rau củ quả tươi sống, giá mầm: 2-4 ngày (vd: 3)
     + Thịt, cá, hải sản tươi: 2-3 ngày (vd: 2)
     + Trái cây tươi (chuối, táo, cam, ổi): 4-7 ngày (vd: 5)
     + Sữa tươi, bánh tươi, đậu hũ: 5-10 ngày (vd: 7)
     + Thực phẩm khô, mì gói, bánh kẹo, gia vị, dầu ăn, gạo: 90-180 ngày (vd: 120)
     + Nước ngọt, bia, đồ hộp: 90-365 ngày (vd: 180)
     + Hóa mỹ phẩm, đồ gia dụng: 365 ngày (vd: 365)
     + Khác: 30 ngày

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng sau (không bao gồm markdown hay chú thích thừa):
{
  "merchant": "BÁCH HÓA XANH",
  "total_bill": 74250,
  "items": [
    {
      "name": "Bánh xốp ống nhân kem socola Jojo gói 100g",
      "stock": 2,
      "price": 7000,
      "original_price": 29400,
      "category_slug": "thuc-pham",
      "expiry_days_estimate": 120
    }
  ]
}
`

    // Active Gemini models ordered by optimal OCR speed & stability
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview',
    ]

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
        if (res.text && res.text.trim()) {
          text = res.text.trim()
          break
        }
      } catch (e: any) {
        console.warn(`Model ${modelName} failed during receipt OCR, trying fallback candidate:`, e?.message || e)
        lastError = e
      }
    }

    if (!text) {
      console.error('All Gemini OCR candidate models failed:', lastError)
      return {
        success: false,
        error: 'Dịch vụ AI nhận diện đang bận hoặc không đọc được ảnh. Vui lòng thử lại sau giây lát hoặc chụp rõ nét hơn.'
      }
    }

    // Resilient JSON extraction
    let parsed: any = null
    try {
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      parsed = JSON.parse(cleanJson)
    } catch (parseErr) {
      // Try to find first [ or { to last ] or }
      const firstBracket = Math.min(
        text.indexOf('{') !== -1 ? text.indexOf('{') : Infinity,
        text.indexOf('[') !== -1 ? text.indexOf('[') : Infinity
      )
      const lastBracket = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
      if (firstBracket !== Infinity && lastBracket > firstBracket) {
        const extracted = text.substring(firstBracket, lastBracket + 1)
        try {
          parsed = JSON.parse(extracted)
        } catch (e) {
          console.error('Failed to parse extracted JSON:', extracted)
        }
      }
    }

    if (!parsed) {
      return {
        success: false,
        error: 'AI không phân tích được dữ liệu JSON từ ảnh hóa đơn. Vui lòng chụp rõ nét hơn.'
      }
    }

    // Handle case where root is array
    let rawItems: any[] = []
    let merchantName: string | undefined = undefined
    let totalBill: number | undefined = undefined

    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && parsed[0].items && Array.isArray(parsed[0].items)) {
        rawItems = parsed[0].items
        merchantName = parsed[0].merchant
        totalBill = parseVietnameseNumber(parsed[0].total_bill)
      } else {
        rawItems = parsed
      }
    } else if (parsed && typeof parsed === 'object') {
      merchantName = parsed.merchant || undefined
      totalBill = parsed.total_bill ? parseVietnameseNumber(parsed.total_bill) : undefined
      rawItems = parsed.items || parsed.products || parsed.data || []
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return {
        success: false,
        error: 'Không tìm thấy dòng sản phẩm nào trong ảnh. Vui lòng chụp rõ hóa đơn hoặc màn hình chi tiết đơn hàng.'
      }
    }

    const scannedItems: ScannedReceiptItem[] = rawItems
      .filter((item: any) => item && (item.name || item.title))
      .map((item: any, idx: number) => {
        // Find matching category ID
        let matchedCategory = categories?.find(c => c.slug === item.category_slug)
        if (!matchedCategory && item.category_slug) {
          matchedCategory = categories?.find(c => c.name.toLowerCase().includes(String(item.category_slug).toLowerCase()))
        }

        const daysEstimate = typeof item.expiry_days_estimate === 'number' && item.expiry_days_estimate > 0 
          ? item.expiry_days_estimate 
          : 7
        
        const calculatedExpiryDate = addDaysFromNow(daysEstimate)
        const itemName = String(item.name || item.title || '').trim()

        return {
          tempId: `scanned-${idx}-${Date.now()}`,
          name: itemName,
          price: parseVietnameseNumber(item.price),
          sale_price: item.sale_price ? parseVietnameseNumber(item.sale_price) : null,
          stock: parseVietnameseNumber(item.stock) > 0 ? parseVietnameseNumber(item.stock) : 1,
          category_id: matchedCategory ? matchedCategory.id : (categories && categories.length > 0 ? categories[0].id : null),
          category_name: matchedCategory ? matchedCategory.name : null,
          expiry_date: calculatedExpiryDate,
          description: `Nhập tự động từ ${merchantName ? `hóa đơn ${merchantName}` : 'hóa đơn mua sắm'}`,
        }
      })

    if (scannedItems.length === 0) {
      return {
        success: false,
        error: 'Không nhận diện được danh sách sản phẩm hợp lệ trong ảnh.'
      }
    }

    return {
      success: true,
      merchantName: merchantName,
      totalBill: totalBill,
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
