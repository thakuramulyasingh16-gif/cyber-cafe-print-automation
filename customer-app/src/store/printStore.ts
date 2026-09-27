import { create } from 'zustand'
import type { DocumentFile, PriceEstimate, Order } from '../lib/api'

type Step = 'upload' | 'settings' | 'payment' | 'confirm'

interface PrintStore {
  step: Step
  setStep: (step: Step) => void
  document: DocumentFile | null
  setDocument: (doc: DocumentFile | null) => void
  copies: number
  setCopies: (n: number) => void
  colorMode: 'BW' | 'COLOR'
  setColorMode: (mode: 'BW' | 'COLOR') => void
  paperSize: 'A4' | 'A3' | 'LETTER'
  setPaperSize: (size: 'A4' | 'A3' | 'LETTER') => void
  duplex: boolean
  setDuplex: (d: boolean) => void
  pageRangeStart: number
  pageRangeEnd: number
  setPageRange: (start: number, end: number) => void
  paymentMode: 'CASH' | 'ONLINE'
  setPaymentMode: (mode: 'CASH' | 'ONLINE') => void
  customerName: string
  setCustomerName: (name: string) => void
  customerPhone: string
  setCustomerPhone: (phone: string) => void
  estimate: PriceEstimate | null
  setEstimate: (estimate: PriceEstimate | null) => void
  order: Order | null
  setOrder: (order: Order | null) => void
  reset: () => void
}

const initialState = {
  step: 'upload' as Step,
  document: null,
  copies: 1,
  colorMode: 'BW' as const,
  paperSize: 'A4' as const,
  duplex: false,
  pageRangeStart: 1,
  pageRangeEnd: 1,
  paymentMode: 'CASH' as const,
  customerName: '',
  customerPhone: '',
  estimate: null,
  order: null,
}

export const usePrintStore = create<PrintStore>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setDocument: (document) => set({ document, pageRangeStart: 1, pageRangeEnd: document?.pageCount || 1 }),
  setCopies: (copies) => set({ copies }),
  setColorMode: (colorMode) => set({ colorMode }),
  setPaperSize: (paperSize) => set({ paperSize }),
  setDuplex: (duplex) => set({ duplex }),
  setPageRange: (pageRangeStart, pageRangeEnd) => set({ pageRangeStart, pageRangeEnd }),
  setPaymentMode: (paymentMode) => set({ paymentMode }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setEstimate: (estimate) => set({ estimate }),
  setOrder: (order) => set({ order }),
  reset: () => set(initialState),
}))
