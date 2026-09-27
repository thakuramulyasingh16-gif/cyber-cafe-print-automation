import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, Image, ChevronRight, ChevronLeft,
  Copy, Printer, CreditCard, Wallet, CheckCircle2,
  Loader2, RefreshCw, Phone, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation } from '@tanstack/react-query'
import { usePrintStore } from '../store/printStore'
import { uploadFile, getPricing, getPriceEstimate, createOrder } from '../lib/api'
import clsx from 'clsx'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatPrice(amount: number): string {
  return `₹${amount.toFixed(2)}`
}

export default function HomePage() {
  const store = usePrintStore()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const { data: pricing } = useQuery({
    queryKey: ['pricing'],
    queryFn: getPricing,
  })

  const estimateMutation = useMutation({
    mutationFn: getPriceEstimate,
    onSuccess: (data) => store.setEstimate(data),
    onError: () => toast.error('Failed to calculate price'),
  })

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      store.setOrder(order)
      store.setStep('confirm')
      toast.success('Order created successfully!')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum 50MB allowed.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      const doc = await uploadFile(file)
      clearInterval(interval)
      setUploadProgress(100)
      store.setDocument(doc)
      setTimeout(() => {
        store.setStep('settings')
        toast.success(`File uploaded! ${doc.pageCount || 1} page(s) detected.`)
      }, 500)
    } catch (err: unknown) {
      clearInterval(interval)
      const message = err instanceof Error ? err.message : 'Upload failed'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }, [store])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  const handleCalculatePrice = () => {
    if (!store.document) return
    estimateMutation.mutate({
      documentId: store.document.id,
      paperSize: store.paperSize,
      colorMode: store.colorMode,
      copies: store.copies,
      pageRangeStart: store.pageRangeStart,
      pageRangeEnd: store.pageRangeEnd,
      duplex: store.duplex,
    })
  }

  const handleCreateOrder = () => {
    if (!store.document || !store.estimate) return
    createOrderMutation.mutate({
      documentId: store.document.id,
      paperSize: store.paperSize,
      colorMode: store.colorMode,
      copies: store.copies,
      pageRangeStart: store.pageRangeStart,
      pageRangeEnd: store.pageRangeEnd,
      duplex: store.duplex,
      paymentMode: store.paymentMode,
      customerName: store.customerName || undefined,
      customerPhone: store.customerPhone || undefined,
    })
  }

  const steps = ['Upload', 'Settings', 'Payment', 'Done']
  const stepIndex = ['upload', 'settings', 'payment', 'confirm'].indexOf(store.step)

  return (
    <div className="min-h-screen bg-[#140c07] py-6 sm:py-10 px-4 relative overflow-x-hidden">
      {/* Soft Ambient Saffron Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-[#f59e0b]/10 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        {/* Header with Claymorphic Styling */}
        <div className="mb-8 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3.5 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#d97706] p-0.5 shadow-[0_6px_16px_rgba(217,119,6,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.4)] flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-[#f59e0b] to-[#b45309] flex items-center justify-center">
                <Printer className="w-6 h-6 text-[#1f1108]" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#fdf7f0]">
                Cyber Cafe <span className="gradient-text">Print Hub</span>
              </h1>
              <p className="text-[#a88a74] text-xs sm:text-sm font-medium">Fast, Contactless & Affordable Printing</p>
            </div>
          </div>

          {/* Claymorphic Stepper */}
          <div className="card p-3 mt-6">
            <div className="flex items-center">
              {steps.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={clsx(
                      'w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all duration-300',
                      i < stepIndex 
                        ? 'bg-[#3b2518] text-[#f59e0b] border border-[#5c3a25] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]' 
                        : i === stepIndex 
                        ? 'bg-gradient-to-b from-[#fbbf24] to-[#d97706] text-[#241308] border border-amber-300 shadow-[0_4px_12px_rgba(217,119,6,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.5)] scale-105' 
                        : 'bg-[#1a100a] text-[#6b4c37] border border-[#331f13]'
                    )}>
                      {i < stepIndex ? '✓' : i + 1}
                    </div>
                    <span className={clsx(
                      'text-[11px] mt-1.5 font-semibold transition-colors',
                      i === stepIndex ? 'text-primary-400 font-bold' : i < stepIndex ? 'text-[#c4a692]' : 'text-[#6b4c37]'
                    )}>{step}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={clsx(
                      'h-1 flex-1 mx-1.5 rounded-full mb-5 transition-all duration-300',
                      i < stepIndex ? 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-[#29190f]'
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Wizard Steps */}
        <AnimatePresence mode="wait">

          {/* STEP 1: UPLOAD */}
          {store.step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="card p-6 sm:p-8"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#fef5ec] tracking-tight">Upload Your Document</h2>
                <p className="text-[#a88a74] text-xs sm:text-sm mt-0.5">Supports PDF, JPG, or PNG • Maximum 50MB</p>
              </div>

              <div
                {...getRootProps()}
                className={clsx(
                  'upload-zone rounded-3xl p-8 sm:p-12 text-center cursor-pointer',
                  isDragActive && 'drag-over',
                  isUploading && 'cursor-not-allowed opacity-80'
                )}
              >
                <input {...getInputProps()} />

                {isUploading ? (
                  <div className="py-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#362217] border border-[#523524] flex items-center justify-center mx-auto mb-4 shadow-[0_4px_16px_rgba(10,5,2,0.6)]">
                      <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                    </div>
                    <p className="text-[#fef5ec] font-bold text-base">Uploading & Analysing...</p>
                    <p className="text-[#a88a74] text-xs mt-1">Detecting pages and document format</p>
                    <div className="mt-5 bg-[#180e08] rounded-full h-3 p-0.5 border border-[#3e271a] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-primary-500 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-primary-400 text-xs font-bold mt-2">{uploadProgress}%</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#3b2518] to-[#25160d] border border-[#543825] flex items-center justify-center mx-auto mb-5 shadow-[0_8px_20px_rgba(12,7,3,0.6),inset_0_1.5px_2px_rgba(255,235,210,0.1)] group-hover:scale-105 transition-transform duration-200">
                      <Upload className="w-9 h-9 text-primary-400" />
                    </div>
                    {isDragActive ? (
                      <p className="text-primary-300 font-bold text-lg animate-pulse">Release file to upload</p>
                    ) : (
                      <>
                        <p className="text-[#fef5ec] font-bold text-lg sm:text-xl">Drag & drop your file here</p>
                        <p className="text-[#a88a74] text-sm mt-1">or tap anywhere to browse files</p>
                        <div className="flex gap-2.5 justify-center mt-7">
                          <div className="flex items-center gap-1.5 bg-[#20130a] border border-[#442c1e] px-3.5 py-1.5 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                            <FileText className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-semibold text-[#ddc2ae]">PDF</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#20130a] border border-[#442c1e] px-3.5 py-1.5 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                            <Image className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-semibold text-[#ddc2ae]">JPG</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#20130a] border border-[#442c1e] px-3.5 py-1.5 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                            <Image className="w-4 h-4 text-amber-300" />
                            <span className="text-xs font-semibold text-[#ddc2ae]">PNG</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: SETTINGS */}
          {store.step === 'settings' && store.document && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-5"
            >
              {/* File details pill */}
              <div className="card p-4 sm:p-5 flex items-center gap-3.5 border border-[#4e3322]">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3b2518] to-[#25160d] border border-[#573926] flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(10,5,2,0.5)]">
                  <FileText className="w-6 h-6 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#fef5ec] font-bold text-sm sm:text-base truncate">{store.document.originalName}</p>
                  <p className="text-[#a88a74] text-xs font-medium mt-0.5">
                    {store.document.pageCount} page(s) detected • {formatFileSize(store.document.sizeBytes)}
                  </p>
                </div>
                <button
                  onClick={() => { store.setDocument(null); store.setStep('upload') }}
                  className="px-3 py-1.5 rounded-xl bg-[#2b1b11] border border-[#442b1b] text-primary-400 hover:text-primary-300 text-xs font-bold transition-all hover:border-primary-500/40"
                >
                  Change
                </button>
              </div>

              {/* Print Configuration Card */}
              <div className="card p-6 sm:p-7 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[#fef5ec]">Print Options</h2>
                  <p className="text-[#a88a74] text-xs mt-0.5">Customize your print preferences below</p>
                </div>

                {/* Color Mode */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a] mb-2.5 block">
                    Color Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['BW', 'COLOR'] as const).map(mode => {
                      const rule = pricing?.find(p => p.paperSize === store.paperSize && p.colorMode === mode)
                      const isSelected = store.colorMode === mode
                      return (
                        <button
                          key={mode}
                          onClick={() => { store.setColorMode(mode); store.setEstimate(null) }}
                          className={clsx(
                            'p-4 rounded-2xl border-2 transition-all duration-200 text-left relative overflow-hidden',
                            isSelected
                              ? 'border-primary-500 bg-gradient-to-b from-[#3b2518] to-[#26180f] shadow-[0_4px_16px_rgba(245,158,11,0.25),inset_0_1px_2px_rgba(255,230,190,0.15)]'
                              : 'border-[#3f291c] bg-[#1f130b] hover:border-[#5a3a27] hover:bg-[#25170e]'
                          )}
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            {mode === 'BW' ? (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-200 to-gray-800 border border-gray-500 shadow-inner" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-primary-500 border border-amber-300 shadow-inner" />
                            )}
                            <span className="font-bold text-[#fdf7f0] text-sm">
                              {mode === 'BW' ? 'Black & White' : 'Full Color'}
                            </span>
                          </div>
                          {rule && (
                            <p className="text-primary-400 font-extrabold text-xs">
                              {formatPrice(rule.pricePerPage)}<span className="text-[#8c6b53] font-normal"> / page</span>
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Paper Size */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a] mb-2.5 block">
                    Paper Size
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['A4', 'A3', 'LETTER'] as const).map(size => {
                      const isSelected = store.paperSize === size
                      return (
                        <button
                          key={size}
                          onClick={() => { store.setPaperSize(size); store.setEstimate(null) }}
                          className={clsx(
                            'py-3 rounded-2xl border-2 font-bold text-sm transition-all duration-200 text-center',
                            isSelected
                              ? 'border-primary-500 bg-gradient-to-b from-[#3b2518] to-[#26180f] text-primary-300 shadow-[0_4px_14px_rgba(245,158,11,0.2),inset_0_1px_1.5px_rgba(255,230,190,0.15)]'
                              : 'border-[#3f291c] bg-[#1f130b] text-[#bfa08a] hover:border-[#5a3a27] hover:text-[#fdf7f0]'
                          )}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Copies Counter */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a] mb-2.5 block">
                    Number of Copies
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { store.setCopies(Math.max(1, store.copies - 1)); store.setEstimate(null) }}
                      className="w-12 h-12 rounded-2xl bg-[#342217] border border-[#523523] flex items-center justify-center text-[#fdf7f0] hover:bg-[#422b1e] hover:border-primary-500/50 transition-all text-2xl font-bold shadow-[0_3px_10px_rgba(10,5,2,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] active:scale-95"
                    >
                      −
                    </button>
                    <div className="flex-1 flex items-center justify-center bg-[#180e08] border border-[#442c1e] rounded-2xl h-12 px-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                      <span className="text-2xl font-black text-primary-400">{store.copies}</span>
                      <span className="text-xs text-[#8c6b53] font-medium ml-2">cop{store.copies !== 1 ? 'ies' : 'y'}</span>
                    </div>
                    <button
                      onClick={() => { store.setCopies(Math.min(100, store.copies + 1)); store.setEstimate(null) }}
                      className="w-12 h-12 rounded-2xl bg-[#342217] border border-[#523523] flex items-center justify-center text-[#fdf7f0] hover:bg-[#422b1e] hover:border-primary-500/50 transition-all text-2xl font-bold shadow-[0_3px_10px_rgba(10,5,2,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Page Range */}
                {store.document.pageCount && store.document.pageCount > 1 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a]">
                        Page Range (Total: {store.document.pageCount} pages)
                      </label>
                      <button
                        onClick={() => { store.setPageRange(1, store.document!.pageCount!); store.setEstimate(null) }}
                        className="text-xs font-bold text-primary-400 hover:text-primary-300"
                      >
                        All pages
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-xs font-bold text-[#8c6b53]">From</span>
                        <input
                          type="number"
                          min={1}
                          max={store.document.pageCount}
                          value={store.pageRangeStart}
                          onChange={e => {
                            store.setPageRange(Math.max(1, parseInt(e.target.value) || 1), store.pageRangeEnd)
                            store.setEstimate(null)
                          }}
                          className="input-field pl-14 text-center font-bold text-primary-400"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-xs font-bold text-[#8c6b53]">To</span>
                        <input
                          type="number"
                          min={store.pageRangeStart}
                          max={store.document.pageCount}
                          value={store.pageRangeEnd}
                          onChange={e => {
                            store.setPageRange(
                              store.pageRangeStart,
                              Math.min(store.document!.pageCount!, parseInt(e.target.value) || store.document!.pageCount!)
                            )
                            store.setEstimate(null)
                          }}
                          className="input-field pl-10 text-center font-bold text-primary-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Duplex (Double-sided) Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1e120a] border border-[#3e271a] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                  <div>
                    <p className="text-sm font-bold text-[#fdf7f0]">Double-sided (Duplex)</p>
                    <p className="text-xs text-[#a88a74]">Print on both sides to save paper</p>
                  </div>
                  <button
                    onClick={() => { store.setDuplex(!store.duplex); store.setEstimate(null) }}
                    className={clsx(
                      'w-14 h-8 rounded-full transition-all duration-200 relative p-1 shadow-inner border',
                      store.duplex 
                        ? 'bg-gradient-to-r from-amber-500 to-primary-600 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]' 
                        : 'bg-[#2e1d13] border-[#442c1e]'
                    )}
                  >
                    <div className={clsx(
                      'w-6 h-6 bg-gradient-to-b from-white to-[#fde68a] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-200',
                      store.duplex ? 'translate-x-6' : 'translate-x-0'
                    )} />
                  </button>
                </div>
              </div>

              {/* Calculate Price Action */}
              <button
                onClick={handleCalculatePrice}
                disabled={estimateMutation.isPending}
                className="btn-primary w-full text-base py-4"
              >
                {estimateMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Calculating Price...</>
                ) : (
                  <>Calculate Total Price <ChevronRight className="w-5 h-5 ml-1.5" /></>
                )}
              </button>

              {/* Price Breakdown Tactile Card */}
              {store.estimate && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card p-6 border-2 border-primary-500/40 bg-gradient-to-b from-[#332014] to-[#20130a] shadow-[0_8px_30px_rgba(245,158,11,0.15)]"
                >
                  <h3 className="text-sm font-black uppercase tracking-wider text-primary-400 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-400" /> Print Summary & Price
                  </h3>
                  <div className="space-y-2.5 mb-5 text-sm">
                    <div className="flex justify-between items-center text-[#c4a692]">
                      <span>Rate per page</span>
                      <span className="text-[#fdf7f0] font-semibold">{formatPrice(store.estimate.pricePerPage)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#c4a692]">
                      <span>Pages per copy</span>
                      <span className="text-[#fdf7f0] font-semibold">{store.estimate.pagesPerCopy}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#c4a692]">
                      <span>Copies</span>
                      <span className="text-[#fdf7f0] font-semibold">{store.estimate.copies}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#c4a692]">
                      <span>Total printed pages</span>
                      <span className="text-[#fdf7f0] font-semibold">{store.estimate.totalPages}</span>
                    </div>
                    <div className="border-t border-[#4a3020] pt-3 flex justify-between items-center">
                      <span className="font-bold text-[#fdf7f0] text-base">Total Payable</span>
                      <span className="font-black text-primary-400 text-2xl drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)]">
                        {formatPrice(store.estimate.totalAmount)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => store.setStep('payment')}
                    className="btn-primary w-full text-base py-3.5"
                  >
                    Continue to Payment <ChevronRight className="w-5 h-5 ml-1" />
                  </button>
                </motion.div>
              )}

              <button
                onClick={() => store.setStep('upload')}
                className="btn-secondary w-full"
              >
                <ChevronLeft className="w-4 h-4 mr-1.5" /> Back to Upload
              </button>
            </motion.div>
          )}

          {/* STEP 3: PAYMENT */}
          {store.step === 'payment' && store.estimate && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-5"
            >
              {/* Order Summary Card */}
              <div className="card p-6">
                <h2 className="text-lg font-bold text-[#fef5ec] mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#a88a74]">Document</span>
                    <span className="text-[#fdf7f0] font-semibold truncate max-w-[200px]">{store.document?.originalName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#a88a74]">Print Mode</span>
                    <span className="text-[#fdf7f0] font-semibold">{store.colorMode === 'BW' ? 'Black & White' : 'Full Color'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#a88a74]">Paper Size</span>
                    <span className="text-[#fdf7f0] font-semibold">{store.paperSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#a88a74]">Copies</span>
                    <span className="text-[#fdf7f0] font-semibold">{store.copies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#a88a74]">Total Pages</span>
                    <span className="text-[#fdf7f0] font-semibold">{store.estimate.totalPages}</span>
                  </div>
                  <div className="border-t border-[#4a3020] pt-3 flex justify-between items-center">
                    <span className="font-bold text-[#fdf7f0] text-base">Grand Total</span>
                    <span className="font-black text-primary-400 text-2xl">{formatPrice(store.estimate.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="card p-6">
                <h3 className="text-base font-bold text-[#fef5ec] mb-3.5">Select Payment Method</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => store.setPaymentMode('CASH')}
                    className={clsx(
                      'w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4',
                      store.paymentMode === 'CASH'
                        ? 'border-primary-500 bg-gradient-to-b from-[#382317] to-[#25170f] shadow-[0_4px_16px_rgba(245,158,11,0.25)]'
                        : 'border-[#3f291c] bg-[#1e120a] hover:border-[#593926]'
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3b2518] to-[#27180f] border border-amber-600/30 flex items-center justify-center flex-shrink-0 shadow-[0_4px_10px_rgba(10,5,2,0.4)]">
                      <Wallet className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#fdf7f0]">Pay Cash at Counter</p>
                      <p className="text-xs text-[#a88a74]">Pay the shopkeeper in cash when collecting prints</p>
                    </div>
                    {store.paymentMode === 'CASH' && (
                      <CheckCircle2 className="w-6 h-6 text-primary-400 flex-shrink-0" />
                    )}
                  </button>

                  <button
                    onClick={() => store.setPaymentMode('ONLINE')}
                    className={clsx(
                      'w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4',
                      store.paymentMode === 'ONLINE'
                        ? 'border-primary-500 bg-gradient-to-b from-[#382317] to-[#25170f] shadow-[0_4px_16px_rgba(245,158,11,0.25)]'
                        : 'border-[#3f291c] bg-[#1e120a] hover:border-[#593926]'
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3b2518] to-[#27180f] border border-amber-600/30 flex items-center justify-center flex-shrink-0 shadow-[0_4px_10px_rgba(10,5,2,0.4)]">
                      <CreditCard className="w-6 h-6 text-amber-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#fdf7f0]">Online Payment</p>
                      <p className="text-xs text-[#a88a74]">UPI, QR code, or Card payment</p>
                    </div>
                    {store.paymentMode === 'ONLINE' && (
                      <CheckCircle2 className="w-6 h-6 text-primary-400 flex-shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Customer Contact Details */}
              <div className="card p-6">
                <h3 className="text-base font-bold text-[#fef5ec] mb-3.5">Customer Info <span className="text-xs font-normal text-[#8c6b53]">(Optional)</span></h3>
                <div className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8c6b53]" />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={store.customerName}
                      onChange={e => store.setCustomerName(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8c6b53]" />
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={store.customerPhone}
                      onChange={e => store.setCustomerPhone(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={createOrderMutation.isPending}
                className="btn-primary w-full text-base py-4"
              >
                {createOrderMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Placing Your Order...</>
                ) : (
                  <>Confirm & Place Order <ChevronRight className="w-5 h-5 ml-1" /></>
                )}
              </button>

              <button
                onClick={() => store.setStep('settings')}
                className="btn-secondary w-full"
              >
                <ChevronLeft className="w-4 h-4 mr-1.5" /> Back to Settings
              </button>
            </motion.div>
          )}

          {/* STEP 4: CONFIRMATION */}
          {store.step === 'confirm' && store.order && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-7 sm:p-9 text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#3d2719] to-[#23150d] border-2 border-primary-500/50 flex items-center justify-center mx-auto shadow-[0_8px_24px_rgba(245,158,11,0.25),inset_0_2px_3px_rgba(255,235,200,0.15)]">
                <CheckCircle2 className="w-10 h-10 text-primary-400" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-[#fef5ec] tracking-tight">Order Placed Successfully!</h2>
                <p className="text-[#a88a74] text-sm mt-1">
                  {store.order.paymentMode === 'CASH'
                    ? 'Please pay cash at the counter to start printing.'
                    : 'Your print order is queued for printing.'}
                </p>
              </div>

              {/* Order Number Box */}
              <div className="bg-[#180e08] border border-[#442c1e] rounded-3xl p-5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.6)]">
                <p className="text-[#a88a74] text-xs uppercase tracking-wider font-bold mb-1.5">Order Number</p>
                <div className="flex items-center justify-center gap-2.5">
                  <p className="text-2xl sm:text-3xl font-black text-primary-400 font-mono tracking-wider">
                    {store.order.orderNumber}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(store.order!.orderNumber)
                      toast.success('Order Number Copied!')
                    }}
                    className="p-2 rounded-xl bg-[#2e1d13] border border-[#4d3120] text-[#c4a692] hover:text-primary-400 hover:border-primary-500/40 transition-colors"
                    title="Copy Order Number"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Order Details List */}
              <div className="bg-[#1f130b] rounded-2xl p-4 border border-[#3b2417] space-y-2.5 text-sm">
                <div className="flex justify-between items-center text-[#c4a692]">
                  <span>Total Amount</span>
                  <span className="text-[#fef5ec] font-bold text-base">{formatPrice(store.order.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-[#c4a692]">
                  <span>Payment Status</span>
                  <span className={clsx(
                    'font-bold px-2.5 py-0.5 rounded-full text-xs clay-pill',
                    store.order.paymentStatus === 'PAID' 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  )}>
                    {store.order.paymentStatus === 'PAID' ? 'Paid ✓' : 'Pending (Cash)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#c4a692]">
                  <span>Print Status</span>
                  <span className="text-primary-400 font-bold">{store.order.status.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {store.order.paymentMode === 'CASH' && (
                <div className="bg-gradient-to-br from-[#3b2618] to-[#29170e] border border-amber-500/30 rounded-2xl p-4 text-left shadow-[0_4px_16px_rgba(245,158,11,0.15)]">
                  <p className="text-primary-400 font-bold text-sm mb-1 flex items-center gap-1.5">
                    <span>💰</span> Cash Payment Required
                  </p>
                  <p className="text-[#c4a692] text-xs leading-relaxed">
                    Please show this order number to the shopkeeper and pay <strong className="text-[#fef5ec]">₹{store.order.totalAmount.toFixed(2)}</strong> at the counter. Your print will commence once confirmed.
                  </p>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <a
                  href={`/order/${store.order.id}`}
                  className="btn-primary w-full text-base py-3.5"
                >
                  Track Order Status Live
                </a>
                <button
                  onClick={() => store.reset()}
                  className="btn-secondary w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Print Another Document
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
