import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Printer, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { getOrder } from '../lib/api'
import { io } from 'socket.io-client'
import clsx from 'clsx'

interface StatusConfig {
  label: string
  color: string
  icon: React.ElementType
  bg: string
  borderColor: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  CREATED: { label: 'Order Created', color: 'text-[#c4a692]', icon: Clock, bg: 'from-[#332217] to-[#24170f]', borderColor: 'border-[#4e3321]' },
  PAYMENT_PENDING: { label: 'Awaiting Payment', color: 'text-amber-400', icon: Clock, bg: 'from-[#422819] to-[#29170e]', borderColor: 'border-amber-500/40' },
  PAID: { label: 'Payment Confirmed', color: 'text-emerald-400', icon: CheckCircle2, bg: 'from-[#2a3820] to-[#1a2614]', borderColor: 'border-emerald-600/40' },
  QUEUED: { label: 'In Print Queue', color: 'text-amber-300', icon: Printer, bg: 'from-[#3d2719] to-[#25170f]', borderColor: 'border-amber-400/40' },
  PRINTING: { label: 'Printing Document...', color: 'text-primary-400', icon: Loader2, bg: 'from-[#472d1a] to-[#2b190f]', borderColor: 'border-primary-500/60' },
  COMPLETED: { label: 'Print Completed!', color: 'text-emerald-400', icon: CheckCircle2, bg: 'from-[#2a3820] to-[#1a2614]', borderColor: 'border-emerald-600/40' },
  PRINT_FAILED: { label: 'Print Failed', color: 'text-rose-400', icon: XCircle, bg: 'from-[#3d1e1c] to-[#261211]', borderColor: 'border-rose-600/40' },
  PAYMENT_FAILED: { label: 'Payment Failed', color: 'text-rose-400', icon: XCircle, bg: 'from-[#3d1e1c] to-[#261211]', borderColor: 'border-rose-600/40' },
  CANCELLED: { label: 'Order Cancelled', color: 'text-[#9c7d68]', icon: AlertTriangle, bg: 'from-[#2e1d13] to-[#1e120a]', borderColor: 'border-[#442b1b]' },
}

export default function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId!),
    refetchInterval: 5000,
    enabled: !!orderId,
  })

  useEffect(() => {
    if (!orderId) return
    const socket = io('http://localhost:3001')
    socket.emit('order:subscribe', orderId)
    socket.on('order:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    })
    return () => { socket.disconnect() }
  }, [orderId, queryClient])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#140c07] flex items-center justify-center">
        <div className="card p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
          <p className="text-[#c4a692] font-semibold text-sm">Loading Order Details...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#140c07] flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-3xl bg-[#351918] border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-rose-400" />
          </div>
          <p className="text-[#fef5ec] font-bold text-lg">Order Not Found</p>
          <p className="text-[#a88a74] text-xs mt-1">Please verify your order link or order number.</p>
          <Link to="/" className="btn-primary mt-6 w-full text-sm py-3">
            Go to Print Portal
          </Link>
        </div>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.CREATED
  const StatusIcon = statusCfg.icon

  return (
    <div className="min-h-screen bg-[#140c07] py-8 px-4 relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-gradient-to-b from-primary-500/10 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-[#bfa08a] hover:text-[#fdf7f0] mb-6 font-semibold text-sm transition-colors px-3 py-1.5 rounded-xl hover:bg-[#25170e]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Print Portal
        </Link>

        <div className="card p-7 sm:p-9 text-center space-y-6">
          {/* Status Icon Orb */}
          <div className={clsx(
            'w-20 h-20 rounded-3xl bg-gradient-to-br border-2 flex items-center justify-center mx-auto shadow-[0_8px_24px_rgba(10,5,2,0.6),inset_0_2px_2px_rgba(255,255,255,0.15)]',
            statusCfg.bg,
            statusCfg.borderColor
          )}>
            <StatusIcon className={clsx('w-10 h-10', statusCfg.color, data.status === 'PRINTING' && 'animate-spin')} />
          </div>

          <div>
            <h1 className={clsx('text-2xl font-black tracking-tight mb-1', statusCfg.color)}>{statusCfg.label}</h1>
            <p className="text-[#a88a74] text-xs sm:text-sm font-mono tracking-wider">Order #{data.orderNumber}</p>
          </div>

          {/* Details Table */}
          <div className="bg-[#180e08] rounded-3xl p-5 border border-[#442c1e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] space-y-3 text-sm">
            <div className="flex justify-between items-center text-[#c4a692]">
              <span>Payable Amount</span>
              <span className="text-[#fef5ec] font-bold text-base">₹{data.totalAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[#c4a692]">
              <span>Color Setting</span>
              <span className="text-[#fdf7f0] font-semibold">{data.colorMode === 'BW' ? 'Black & White' : 'Full Color'}</span>
            </div>
            <div className="flex justify-between items-center text-[#c4a692]">
              <span>Paper Size</span>
              <span className="text-[#fdf7f0] font-semibold">{data.paperSize}</span>
            </div>
            <div className="flex justify-between items-center text-[#c4a692]">
              <span>Copies Requested</span>
              <span className="text-[#fdf7f0] font-semibold">{data.copies}</span>
            </div>
            <div className="flex justify-between items-center text-[#c4a692]">
              <span>Payment Status</span>
              <span className={clsx(
                'font-bold px-3 py-0.5 rounded-full text-xs clay-pill',
                data.paymentStatus === 'PAID' 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              )}>
                {data.paymentStatus}
              </span>
            </div>
          </div>

          {/* Dynamic contextual banner */}
          {data.status === 'PAYMENT_PENDING' && (
            <motion.div
              animate={{ opacity: [1, 0.65, 1] }}
              transition={{ repeat: Infinity, duration: 2.2 }}
              className="bg-gradient-to-br from-[#3d2719] to-[#26170e] border border-amber-500/40 rounded-2xl p-4 shadow-[0_4px_16px_rgba(245,158,11,0.15)] text-left"
            >
              <p className="text-primary-400 text-sm font-bold flex items-center gap-1.5">
                <span>⏳</span> Waiting for counter payment...
              </p>
              <p className="text-[#c4a692] text-xs mt-1 leading-relaxed">
                Show your order number <strong className="text-[#fdf7f0] font-mono">{data.orderNumber}</strong> to the shopkeeper and pay ₹{data.totalAmount?.toFixed(2)}.
              </p>
            </motion.div>
          )}

          {data.status === 'QUEUED' && (
            <div className="bg-gradient-to-br from-[#3b2719] to-[#25170f] border border-amber-500/30 rounded-2xl p-4 text-center">
              <p className="text-primary-300 text-sm font-bold">📄 In Printer Queue</p>
              <p className="text-[#a88a74] text-xs mt-1">Your document is queued and will print momentarily.</p>
            </div>
          )}

          {data.status === 'PRINTING' && (
            <motion.div
              animate={{ opacity: [1, 0.75, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="bg-gradient-to-br from-[#422919] to-[#2b190f] border border-primary-500/50 rounded-2xl p-4 shadow-[0_4px_20px_rgba(245,158,11,0.2)] text-center"
            >
              <p className="text-primary-400 text-sm font-bold flex items-center justify-center gap-2">
                <Printer className="w-4 h-4 animate-bounce" /> Printing Document Now...
              </p>
              <p className="text-[#c4a692] text-xs mt-1">Please stand near the printer tray.</p>
            </motion.div>
          )}

          {data.status === 'COMPLETED' && (
            <div className="bg-gradient-to-br from-[#26351d] to-[#172311] border border-emerald-500/40 rounded-2xl p-4 text-center shadow-[0_4px_16px_rgba(16,185,129,0.15)]">
              <p className="text-emerald-400 text-sm font-bold">✅ Print Complete!</p>
              <p className="text-emerald-200/80 text-xs mt-1">Your documents are ready for collection at the counter.</p>
            </div>
          )}

          {data.status === 'PRINT_FAILED' && (
            <div className="bg-gradient-to-br from-[#3a1d1c] to-[#241211] border border-rose-500/40 rounded-2xl p-4 text-center shadow-[0_4px_16px_rgba(244,63,94,0.15)]">
              <p className="text-rose-400 text-sm font-bold">❌ Print Unsuccessful</p>
              <p className="text-rose-200/80 text-xs mt-1">Please speak to the shopkeeper directly to reprint.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
