import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getOrders, cancelOrder } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'
import { Search, ChevronRight, ChevronLeft, ShoppingBag } from 'lucide-react'
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

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, search, statusFilter],
    queryFn: () => getOrders({ page, limit: 20, search: search || undefined, status: statusFilter || undefined }),
  })

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      toast.success('Order cancelled')
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const orders = data?.orders || []
  const pagination = data?.pagination

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#fdf7f0] tracking-tight">Print Orders</h1>
        <p className="text-[#a88a74] text-sm mt-1">Search, monitor and manage customer print orders</p>
      </div>

      {/* Claymorphic Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-[#8c6b53]" />
          <input
            type="text"
            placeholder="Search by order number or customer name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input-field pl-11 py-3"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="input-field w-full sm:w-56 py-3 font-semibold"
        >
          <option value="">All Statuses</option>
          <option value="PAYMENT_PENDING">Payment Pending</option>
          <option value="PAID">Paid</option>
          <option value="QUEUED">Queued</option>
          <option value="PRINTING">Printing</option>
          <option value="COMPLETED">Completed</option>
          <option value="PRINT_FAILED">Print Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Orders Table Container */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#3e271a] bg-[#22150d]/80 text-[#a88a74] text-[11px] font-bold uppercase tracking-wider">
                <th className="p-4 sm:px-6">Order #</th>
                <th className="p-4">Document</th>
                <th className="p-4">Specs</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Placed</th>
                <th className="p-4 sm:pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#332014] text-sm">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="p-4 sm:px-6">
                        <div className="h-4 bg-[#2b1b11] rounded-xl animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-14 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-[#28180f] border border-[#3e271a] flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <ShoppingBag className="w-8 h-8 text-[#6d4d38]" />
                    </div>
                    <p className="text-[#fef5ec] font-bold">No orders found</p>
                    <p className="text-[#8c6b53] text-xs mt-1">Try adjusting your search or status filter</p>
                  </td>
                </tr>
              ) : (
                orders.map((order: {
                  id: string
                  orderNumber: string
                  status: string
                  paymentMode: string
                  paymentStatus: string
                  totalAmount: number
                  copies: number
                  colorMode: string
                  paperSize: string
                  createdAt: string
                  customerName: string | null
                  document: { originalName: string }
                }) => (
                  <tr key={order.id} className="hover:bg-[#2c1c11]/50 transition-colors">
                    <td className="p-4 sm:px-6">
                      <p className="text-[#fdf7f0] font-mono text-sm font-bold tracking-wider">{order.orderNumber}</p>
                      {order.customerName && (
                        <p className="text-[#8c6b53] text-xs font-medium">{order.customerName}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-[#e2cbba] font-semibold text-sm truncate max-w-[180px]">{order.document?.originalName}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-[#c4a692] text-xs font-semibold">{order.colorMode === 'BW' ? 'B&W' : 'Color'} • {order.paperSize}</p>
                      <p className="text-[#8c6b53] text-[11px] mt-0.5">{order.copies} cop{order.copies !== 1 ? 'ies' : 'y'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-primary-400 font-black text-base">₹{order.totalAmount.toFixed(0)}</p>
                      <p className="text-[#8c6b53] text-[11px] uppercase font-bold">{order.paymentMode}</p>
                    </td>
                    <td className="p-4">
                      <span className={clsx(STATUS_COLORS[order.status] || 'badge-gray', 'block w-fit')}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-[#a88a74] text-xs font-medium">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </td>
                    <td className="p-4 sm:pr-6 text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-[#342217] border border-[#523523] text-primary-400 hover:text-white hover:border-primary-500/50 text-xs font-bold transition-all shadow-sm"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination && pagination.pages > 1 && (
          <div className="p-4 sm:px-6 border-t border-[#3e271a] flex items-center justify-between bg-[#1f130b]/60">
            <p className="text-[#8c6b53] text-xs font-semibold">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total} orders
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs px-3.5 py-2 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="btn-secondary text-xs px-3.5 py-2 disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
