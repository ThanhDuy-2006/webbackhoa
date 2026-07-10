'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, User, Bot, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: Date
}

const FAQS = [
  { q: "Làm thế nào để nạp tiền?", a: "Bạn truy cập vào trang Cá nhân -> Ví của tôi -> nhập số tiền cần nạp và chuyển khoản theo thông tin hiển thị. Quản trị viên sẽ phê duyệt giao dịch của bạn trong ít phút!" },
  { q: "Thời gian giao hàng thế nào?", a: "Chúng tôi hỗ trợ giao hàng siêu tốc trong vòng 2 giờ đối với các đơn hàng thực phẩm tươi sống, thịt cá và rau củ trong phạm vi nội thành." },
  { q: "Chính sách đổi trả ra sao?", a: "Bách Hóa hỗ trợ đổi trả miễn phí trong vòng 7 ngày đối với các sản phẩm lỗi do nhà sản xuất hoặc dập nát trong quá trình vận chuyển." },
  { q: "Liên hệ trực tiếp với ai?", a: "Bạn có thể liên hệ hotline hỗ trợ khách hàng 24/7 của chúng tôi: 1900 1234 hoặc gửi email về hotro@bachhoa.vn." }
]

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'bot', text: 'Xin chào! Bách Hóa có thể trợ giúp gì cho bạn hôm nay?', timestamp: new Date() }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen, isTyping])

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsTyping(true)

    // Simulate bot response after 1 second
    setTimeout(() => {
      let responseText = "Cảm ơn bạn đã liên hệ! Yêu cầu của bạn đã được ghi nhận. Để hỗ trợ tốt nhất, bạn có thể tham khảo mục câu hỏi thường gặp bên dưới hoặc gửi email cho đội ngũ hỗ trợ nhé."
      
      // Match keyword in text to find custom answer
      const matchedFaq = FAQS.find(faq => textToSend.toLowerCase().includes(faq.q.toLowerCase()) || faq.q.toLowerCase().includes(textToSend.toLowerCase()))
      if (matchedFaq) {
        responseText = matchedFaq.a
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: responseText,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, botMsg])
      setIsTyping(false)
    }, 1000)
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50">
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_24px_rgba(5,150,105,0.4)] flex items-center justify-center cursor-pointer border border-emerald-500/20"
        style={{ minWidth: '56px', minHeight: '56px' }}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="absolute bottom-16 right-0 w-[calc(100vw-32px)] sm:w-[360px] h-[480px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-emerald-600 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">BH</div>
                <div>
                  <h4 className="font-bold text-sm leading-none">Hỗ trợ Bách Hóa</h4>
                  <span className="text-[10px] text-emerald-100/90 flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Trực tuyến
                  </span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white hover:text-emerald-100 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-2.5 max-w-[85%]", msg.sender === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  <div className={cn("w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold shadow-sm", msg.sender === 'user' ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-800 border dark:border-slate-700 text-emerald-600")}>
                    {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={cn("rounded-2xl p-3.5 text-xs shadow-sm", msg.sender === 'user' ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white dark:bg-slate-900 border dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none")}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-2.5 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 border dark:border-slate-700 text-emerald-600 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-slate-400 text-xs shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick FAQs */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2 shrink-0">
              {FAQS.map((faq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(faq.q)}
                  className="px-3.5 py-2 rounded-full border border-emerald-100 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold hover:bg-emerald-50 hover:text-emerald-800 transition-colors shrink-0 cursor-pointer"
                  style={{ minHeight: '32px' }}
                >
                  <HelpCircle className="w-3 h-3 inline-block mr-1" />
                  {faq.q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 shrink-0">
              <Input
                placeholder="Nhập câu hỏi của bạn..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend(inputText)
                }}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs focus-visible:ring-emerald-600"
              />
              <Button size="icon" onClick={() => handleSend(inputText)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0 cursor-pointer h-10 w-10">
                <Send className="h-4.5 w-4.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
