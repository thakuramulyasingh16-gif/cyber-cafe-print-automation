import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export type DocumentFile = {
  id: string
  originalName: string
  sizeBytes: number
  pageCount: number | null
  mimeType: string
}

export type PricingRule = {
  id: string
  paperSize: 'A4' | 'A3' | 'LETTER'
  colorMode: 'BW' | 'COLOR'
  pricePerPage: number
}

export type Order = {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  totalAmount: number
  totalPages: number
  copies: number
  paymentMode: string
  colorMode: string
  paperSize: string
  createdAt: string
}

export type PriceEstimate = {
  pricePerPage: number
  pagesPerCopy: number
  copies: number
  totalPages: number
  totalAmount: number
  duplex: boolean
}

export const uploadFile = async (file: File): Promise<DocumentFile> => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.document
}

export const getPricing = async (): Promise<PricingRule[]> => {
  const { data } = await api.get('/pricing')
  return data.rules
}

export const getPriceEstimate = async (params: {
  documentId: string
  paperSize: string
  colorMode: string
  copies: number
  pageRangeStart?: number
  pageRangeEnd?: number
  duplex?: boolean
}): Promise<PriceEstimate> => {
  const { data } = await api.post('/orders/price-estimate', params)
  return data.estimate
}

export const createOrder = async (params: {
  documentId: string
  paperSize: string
  colorMode: string
  copies: number
  pageRangeStart?: number
  pageRangeEnd?: number
  duplex?: boolean
  paymentMode: string
  customerName?: string
  customerPhone?: string
}): Promise<Order> => {
  const { data } = await api.post('/orders', params)
  return data.order
}

export const getOrder = async (orderId: string): Promise<Order> => {
  const { data } = await api.get(`/orders/${orderId}`)
  return data.order
}

export const getSettings = async () => {
  const { data } = await api.get('/settings')
  return data.settings
}
