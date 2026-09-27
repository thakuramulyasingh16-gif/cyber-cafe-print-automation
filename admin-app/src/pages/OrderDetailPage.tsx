import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrder, confirmCashPayment, cancelOrder } from '../lib/api'
import { formatDistanceToNow, format } from 'date-fns'
import { ArrowLeft, CheckCircle2, XCircle, Loader2, FileText, Printer, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'badge-gray',
  PAYMENT_PENDING: 'badge-yellow',
  PAID: 'badge-green',
  QUEUED: 'badge-blue',
  PRINTING: 'badge-purple',
  COMPLETED: 'badge-green',
  PRINT_FAILED: 'badge-red',
  PAYMENT_FAILED: 'badge-red',
  CANCELLED: 'badge-gray',
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => getOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: 5000,
  })

  const confirmPaymentMutation = useMutation({
    mutationFn: () => confirmCashPayment(orderId!, 'Confirmed by admin'),
    onSuccess: () => {
      toast.success('Payment confirmed! Order queued for printing.')
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(orderId!),
    onSuccess: () => {
      toast.success('Order cancelled')
      navigate('/orders')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="card p-6 flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
          <span className="text-[#a88a74] font-semibold text-sm">Loading Order Details...</span>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="card p-8 text-center">
          <p className="text-rose-400 font-bold mb-2">Order Not Found</p>
          <Link to="/orders" className="btn-secondary inline-flex text-xs px-4 py-2 mt-2">
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  const canConfirmPayment = order.paymentMode === 'CASH' && order.paymentStatus === 'PENDING'
  const canCancel = ['CREATED', 'PAYMENT_PENDING', 'PAID', 'QUEUED'].includes(order.status)
  const latestPrintJob = order.printJobs?.[0]

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/orders" className="btn-secondary text-xs px-3.5 py-2">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Orders
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-[#fdf7f0] font-mono tracking-wider">{order.orderNumber}</h1>
          <p className="text-[#a88a74] text-xs font-semibold mt-0.5">
            Placed {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
          </p>
        </div>
        <span className={clsx(STATUS_COLORS[order.status] || 'badge-gray', 'ml-auto text-xs px-3 py-1')}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Details */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-primary-400 flex items-center gap-2 border-b border-[#3e271a] pb-3">
            <FileText className="w-4 h-4" /> Document & Print Specs
          </h2>
          <div className="space-y-3 text-sm">
            <Row label="Document File" value={order.document?.originalName} />
            <Row label="Document Pages" value={order.document?.pageCount?.toString() || '—'} />
            <Row label="Color Mode" value={order.colorMode === 'BW' ? 'Black & White' : 'Full Color'} />
            <Row label="Paper Size" value={order.paperSize} />
            <Row label="Copies" value={order.copies.toString()} />
            <Row label="Total Pages" value={order.totalPages.toString()} />
            <Row label="Rate per Page" value={`₹${order.pricePerPage?.toFixed(2) || '—'}`} />
            <div className="border-t border-[#3e271a] pt-3">
              <Row label="Total Amount" value={`₹${order.totalAmount.toFixed(2)}`} highlight />
            </div>
          </div>
        </div>

        {/* Payment & Actions */}
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-primary-400 flex items-center gap-2 border-b border-[#3e271a] pb-3">
              Payment Overview
            </h2>
            <div className="space-y-3 text-sm">
              <Row label="Payment Mode" value={order.paymentMode} />
              <div className="flex justify-between items-center">
                <span className="text-[#a88a74]">Payment Status</span>
                <span className={clsx(
                  'font-bold px-2.5 py-0.5 rounded-full text-xs clay-pill',
                  order.paymentStatus === 'PAID' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                )}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.paidAt && <Row label="Confirmed At" value={format(new Date(order.paidAt), 'dd MMM yyyy, HH:mm')} />}
              {order.customerName && <Row label="Customer Name" value={order.customerName} />}
              {order.customerPhone && <Row label="Customer Phone" value={order.customerPhone} />}
            </div>
          </div>

          {/* Actions Card */}
          {(canConfirmPayment || canCancel) && (
            <div className="card p-6 space-y-4 bg-gradient-to-b from-[#301f14] to-[#21140c]">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#fdf7f0]">Required Actions</h2>
              <div className="space-y-3">
                {canConfirmPayment && (
                  <button
                    onClick={() => confirmPaymentMutation.mutate()}
                    disabled={confirmPaymentMutation.isPending}
                    id="confirm-payment-btn"
                    className="btn-success w-full py-3.5 text-sm"
                  >
                    {confirmPaymentMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Confirming Cash...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Cash Payment (₹{order.totalAmount.toFixed(0)})</>
                    )}
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this order?')) {
                        cancelMutation.mutate()
                      }
                    }}
                    disabled={cancelMutation.isPending}
                    className="btn-danger w-full py-3 text-xs"
                  >
                    {cancelMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Cancelling...</>
                    ) : (
                      <><XCircle className="w-4 h-4 mr-1.5" /> Cancel Order</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Print Job Status Card */}
          {latestPrintJob && (
            <div className="card p-6 space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-primary-400 flex items-center gap-2 border-b border-[#3e271a] pb-3">
                <Printer className="w-4 h-4" /> Print Agent Job
              </h2>
              <div className="space-y-2.5 text-sm">
                <Row label="Job Status" value={latestPrintJob.status} />
                <Row label="Attempts" value={`${latestPrintJob.attempts} / ${latestPrintJob.maxAttempts}`} />
                {latestPrintJob.printer && <Row label="Assigned Printer" value={latestPrintJob.printer.displayName} />}
                {latestPrintJob.lastError && (
                  <div className="bg-[#381c1a] border border-rose-600/40 rounded-2xl p-3 mt-2">
                    <p className="text-xs text-rose-300 font-semibold">{latestPrintJob.lastError}</p>
                  </div>
                )}
                {latestPrintJob.startedAt && (
                  <Row label="Started At" value={format(new Date(latestPrintJob.startedAt), 'HH:mm:ss')} />
                )}
                {latestPrintJob.completedAt && (
                  <Row label="Finished At" value={format(new Date(latestPrintJob.completedAt), 'HH:mm:ss')} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity / Audit Log */}
      {order.auditLogs && order.auditLogs.length > 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#fdf7f0] flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-400" /> Order Activity Timeline
          </h2>
          <div className="space-y-3">
            {order.auditLogs.map((log: { id: string; action: string; createdAt: string; details?: string }) => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[#1e120a] border border-[#3a2517]">
                <div className="w-2.5 h-2.5 rounded-full bg-primary-400 flex-shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className="text-[#fef5ec] font-bold text-xs sm:text-sm">{log.action.replace(/_/g, ' ')}</span>
                <span className="text-[#8c6b53] text-xs ml-auto font-medium">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[#a88a74] text-xs sm:text-sm font-medium">{label}</span>
      <span className={clsx(
        'font-bold text-right truncate max-w-[220px]',
        highlight ? 'text-primary-400 text-lg font-black' : 'text-[#fdf7f0] text-xs sm:text-sm'
      )}>
        {value}
      </span>
    </div>
  )
}
