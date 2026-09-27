import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    const message = error.response?.data?.message || error.message || 'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

// Types
export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
}

export interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMode: string
  totalAmount: number
  totalPages: number
  copies: number
  colorMode: string
  paperSize: string
  pricePerPage?: number
  customerName: string | null
  customerPhone: string | null
  createdAt: string
  paidAt: string | null
  completedAt: string | null
  document: { originalName: string; pageCount: number | null }
  printJobs: PrintJob[]
  payments: Payment[]
  auditLogs?: { id: string; action: string; createdAt: string; details?: string }[]
}

export interface PrintJob {
  id: string
  orderId: string
  status: string
  attempts: number
  maxAttempts: number
  lastError: string | null
  queuedAt: string
  startedAt: string | null
  completedAt: string | null
  printer: Printer | null
  order?: {
    orderNumber?: string
    colorMode?: string
    copies?: number
    paperSize?: string
    document?: { originalName: string }
  }
}

export interface Printer {
  id: string
  name: string
  displayName: string
  isDefault: boolean
  isActive: boolean
  status: string
  lastSeen: string | null
}

export interface Payment {
  id: string
  method: string
  amount: number
  status: string
  confirmedAt: string | null
}

export interface PricingRule {
  id: string
  paperSize: string
  colorMode: string
  pricePerPage: number
  isActive: boolean
}

export interface DashboardStats {
  totalOrders: number
  pendingPayments: number
  queuedJobs: number
  printingJobs: number
  completedOrders: number
  failedOrders: number
  revenue: number
}

// Auth
export const login = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export const getMe = async (): Promise<AdminUser> => {
  const { data } = await api.get('/auth/me')
  return data.user
}

// Dashboard
export const getDashboard = async () => {
  const { data } = await api.get('/admin/dashboard')
  return data
}

// Orders
export const getOrders = async (params: {
  page?: number
  limit?: number
  status?: string
  paymentStatus?: string
  search?: string
}) => {
  const { data } = await api.get('/admin/orders', { params })
  return data
}

export const getOrder = async (orderId: string): Promise<Order> => {
  const { data } = await api.get(`/admin/orders/${orderId}`)
  return data.order
}

export const confirmCashPayment = async (orderId: string, notes?: string) => {
  const { data } = await api.post(`/admin/orders/${orderId}/confirm-payment`, { notes })
  return data
}

export const cancelOrder = async (orderId: string) => {
  const { data } = await api.post(`/admin/orders/${orderId}/cancel`)
  return data
}

// Print Queue
export const getPrintQueue = async () => {
  const { data } = await api.get('/admin/print-queue')
  return data.jobs as PrintJob[]
}

export const retryPrintJob = async (jobId: string) => {
  const { data } = await api.post(`/admin/print-jobs/${jobId}/retry`)
  return data
}

export const getAllPrintJobs = async () => {
  const { data } = await api.get('/print/admin/jobs')
  return data.jobs as PrintJob[]
}

// Pricing
export const getPricing = async (): Promise<PricingRule[]> => {
  const { data } = await api.get('/pricing')
  return data.rules
}

export const updatePricing = async (rules: { paperSize: string; colorMode: string; pricePerPage: number; isActive?: boolean }[]) => {
  const { data } = await api.put('/pricing', { rules })
  return data
}

// Printers
export const getPrinters = async (): Promise<Printer[]> => {
  const { data } = await api.get('/admin/printers')
  return data.printers
}

export const addPrinter = async (printer: { name: string; displayName: string; isDefault?: boolean }) => {
  const { data } = await api.post('/admin/printers', printer)
  return data
}

// Settings
export const getSettings = async () => {
  const { data } = await api.get('/settings/all')
  return data.settings
}

export const updateSettings = async (settings: Record<string, string>) => {
  const { data } = await api.put('/settings', settings)
  return data
}

export const getQRCode = async () => {
  const { data } = await api.get('/settings/qrcode')
  return data
}
