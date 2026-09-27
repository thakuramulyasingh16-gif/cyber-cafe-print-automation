import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../lib/api'
import {
  ShoppingBag, Clock, ListOrdered, Printer,
  CheckCircle2, XCircle, IndianRupee, TrendingUp
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const ORDER_STATUS_COLORS: Record<string, string> = {
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

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 15000,
  })

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-[#25170f]" />
          ))}
        </div>
      </div>
    )
  }

  const stats = data?.stats
  const recentOrders = data?.recentOrders || []

  const statCards = [
    { label: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ShoppingBag, color: 'text-primary-400', bg: 'from-[#3d2719] to-[#25170f]', border: 'border-primary-500/30' },
    { label: 'Pending Payment', value: stats?.pendingPayments ?? 0, icon: Clock, color: 'text-amber-400', bg: 'from-[#422919] to-[#28180e]', border: 'border-amber-500/30' },
    { label: 'In Print Queue', value: stats?.queuedJobs ?? 0, icon: ListOrdered, color: 'text-amber-300', bg: 'from-[#3a2517] to-[#23150d]', border: 'border-amber-400/30' },
    { label: 'Printing Right Now', value: stats?.printingJobs ?? 0, icon: Printer, color: 'text-primary-400', bg: 'from-[#442c1b] to-[#27190f]', border: 'border-primary-500/40' },
    { label: 'Completed Orders', value: stats?.completedOrders ?? 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'from-[#25391d] to-[#182713]', border: 'border-emerald-600/30' },
    { label: 'Failed Orders', value: stats?.failedOrders ?? 0, icon: XCircle, color: 'text-rose-400', bg: 'from-[#3d1d1c] to-[#261211]', border: 'border-rose-600/30' },
    { label: 'Total Revenue', value: `₹${(stats?.revenue ?? 0).toFixed(0)}`, icon: IndianRupee, color: 'text-primary-400', bg: 'from-[#4a2e19] to-[#29170d]', border: 'border-primary-500/50', wide: true },
    { label: "Today's Orders", value: recentOrders.length, icon: TrendingUp, color: 'text-amber-300', bg: 'from-[#392417] to-[#22150d]', border: 'border-amber-500/30' },
  ]

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#fdf7f0] tracking-tight">Admin Dashboard</h1>
        <p className="text-[#a88a74] text-sm mt-1">Real-time cafe printing activity and financial overview</p>
      </div>

      {/* Tactile Clay Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {statCards.map(card => (
          <div key={card.label} className={clsx('stat-card', card.wide && 'col-span-2')}>
            <div className="flex items-center justify-between">
              <span className="text-[#a88a74] text-xs font-bold uppercase tracking-wider">{card.label}</span>
              <div className={clsx(
                'w-9 h-9 rounded-2xl bg-gradient-to-br border flex items-center justify-center shadow-[0_3px_8px_rgba(10,5,2,0.4),inset_0_1px_1.5px_rgba(255,255,255,0.15)]',
                card.bg,
                card.border
              )}>
                <card.icon className={clsx('w-4 h-4', card.color)} />
              </div>
            </div>
            <p className={clsx('text-2xl sm:text-3xl font-black mt-2 tracking-tight', card.color)}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Orders Section */}
      <div className="card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#3e271a] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#fef5ec]">Recent Print Orders</h2>
            <p className="text-xs text-[#a88a74] mt-0.5">Most recent incoming customer print requests</p>
          </div>
          <span className="text-xs font-bold text-primary-400 bg-[#2b1b11] border border-[#442c1e] px-3 py-1 rounded-full">
            Live Stream
          </span>
        </div>

        <div className="divide-y divide-[#332014]">
          {recentOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#28180f] border border-[#3e271a] flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ShoppingBag className="w-8 h-8 text-[#6d4d38]" />
              </div>
              <p className="text-[#fef5ec] font-bold text-sm">No orders received yet</p>
              <p className="text-[#8c6b53] text-xs mt-1">Orders placed via the customer portal will appear here.</p>
            </div>
          ) : (
            recentOrders.map((order: {
              id: string
              orderNumber: string
              status: string
              paymentMode: string
              totalAmount: number
              copies: number
              colorMode: string
              createdAt: string
              document: { originalName: string }
            }) => (
              <div key={order.id} className="p-4 sm:p-5 flex items-center gap-4 hover:bg-[#2e1d13]/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <p className="text-[#fdf7f0] font-black text-sm font-mono tracking-wider">{order.orderNumber}</p>
                    <span className={ORDER_STATUS_COLORS[order.status] || 'badge-gray'}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[#c4a692] text-xs truncate font-medium">{order.document?.originalName}</p>
                  <p className="text-[#8c6b53] text-[11px] mt-0.5">
                    {order.copies} cop{order.copies !== 1 ? 'ies' : 'y'} • {order.colorMode === 'BW' ? 'Black & White' : 'Color'} •{' '}
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-primary-400 font-black text-base sm:text-lg">₹{order.totalAmount.toFixed(0)}</p>
                  <p className="text-[#a88a74] text-xs font-semibold uppercase">{order.paymentMode}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
