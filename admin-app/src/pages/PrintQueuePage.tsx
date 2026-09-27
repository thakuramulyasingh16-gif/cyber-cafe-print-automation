import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPrintQueue, retryPrintJob } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, ListOrdered, RefreshCw, AlertTriangle, CheckCircle2, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const JOB_STATUS_STYLES: Record<string, string> = {
  QUEUED: 'badge-blue',
  PRINTING: 'badge-purple',
  COMPLETED: 'badge-green',
  FAILED: 'badge-red',
  CANCELLED: 'badge-gray',
}

export default function PrintQueuePage() {
  const queryClient = useQueryClient()

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['print-queue'],
    queryFn: getPrintQueue,
    refetchInterval: 5000,
  })

  const retryMutation = useMutation({
    mutationFn: retryPrintJob,
    onSuccess: () => {
      toast.success('Print job requeued')
      queryClient.invalidateQueries({ queryKey: ['print-queue'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#fdf7f0] tracking-tight">Print Queue Monitor</h1>
          <p className="text-[#a88a74] text-sm mt-1">Live background print jobs processed by the local Windows print agent</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['print-queue'] })}
          className="btn-secondary text-xs px-4 py-2.5"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Queue
        </button>
      </div>

      {/* Queue Stats Cards */}
      <div className="grid grid-cols-3 gap-4 sm:gap-5">
        {[
          { label: 'Pending in Queue', count: jobs.filter((j: { status: string }) => j.status === 'QUEUED').length, color: 'text-amber-400', bg: 'from-[#3a2517] to-[#25170f]', border: 'border-amber-500/30' },
          { label: 'Actively Printing', count: jobs.filter((j: { status: string }) => j.status === 'PRINTING').length, color: 'text-primary-400', bg: 'from-[#422919] to-[#29170e]', border: 'border-primary-500/40' },
          { label: 'Failed Jobs', count: jobs.filter((j: { status: string }) => j.status === 'FAILED').length, color: 'text-rose-400', bg: 'from-[#3b1d1c] to-[#261211]', border: 'border-rose-600/30' },
        ].map(stat => (
          <div key={stat.label} className="card p-5 sm:p-6 text-center">
            <p className={clsx('text-3xl sm:text-4xl font-black tracking-tight', stat.color)}>{stat.count}</p>
            <p className="text-[#a88a74] text-xs font-bold uppercase tracking-wider mt-1.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Jobs List */}
      <div className="card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#3e271a] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#fef5ec]">Queued & Active Print Jobs</h2>
          <span className="text-xs font-semibold text-[#8c6b53]">Agent Polling Rate: 3s</span>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#28180f] border border-[#3e271a] flex items-center justify-center mx-auto mb-3 shadow-inner">
              <ListOrdered className="w-8 h-8 text-[#6d4d38]" />
            </div>
            <p className="text-[#fef5ec] font-bold text-base">Print queue is currently empty</p>
            <p className="text-[#8c6b53] text-xs mt-1">Jobs will appear here automatically when orders are confirmed.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#332014]">
            {jobs.map((job) => (
              <div key={job.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-[#2b1b11]/50 transition-colors">
                <div className={clsx(
                  'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(10,5,2,0.4)] border',
                  job.status === 'PRINTING' ? 'bg-[#3b2518] border-primary-500/50' :
                  job.status === 'FAILED' ? 'bg-[#381c1a] border-rose-600/50' :
                  job.status === 'COMPLETED' ? 'bg-[#1e3019] border-emerald-600/50' : 
                  'bg-[#281910] border-[#442c1e]'
                )}>
                  {job.status === 'PRINTING' ? (
                    <Printer className="w-6 h-6 text-primary-400 animate-pulse" />
                  ) : job.status === 'FAILED' ? (
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  ) : job.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ListOrdered className="w-6 h-6 text-amber-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <p className="text-[#fdf7f0] font-mono text-sm font-bold tracking-wider">{job.order?.orderNumber || '—'}</p>
                    <span className={JOB_STATUS_STYLES[job.status] || 'badge-gray'}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-[#c4a692] text-xs sm:text-sm font-medium truncate">{job.order?.document?.originalName}</p>
                  <div className="flex flex-wrap gap-2.5 mt-1.5 text-xs text-[#8c6b53]">
                    <span className="font-semibold">{job.order?.copies} cop{job.order?.copies !== 1 ? 'ies' : 'y'}</span>
                    <span>•</span>
                    <span className="font-semibold">{job.order?.colorMode === 'BW' ? 'Black & White' : 'Color'}</span>
                    <span>•</span>
                    <span className="font-semibold">{job.order?.paperSize}</span>
                    {job.printer && (
                      <>
                        <span>•</span>
                        <span className="text-[#a88a74]">🖨️ {job.printer.displayName}</span>
                      </>
                    )}
                  </div>
                  {job.lastError && (
                    <div className="bg-[#381c1a] border border-rose-600/40 rounded-xl p-2 mt-2">
                      <p className="text-xs text-rose-300 font-semibold">Error: {job.lastError}</p>
                    </div>
                  )}
                </div>

                <div className="text-left sm:text-right flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#332014]">
                  <p className="text-[#a88a74] text-xs font-medium">
                    Queued {formatDistanceToNow(new Date(job.queuedAt), { addSuffix: true })}
                  </p>
                  <p className="text-[#8c6b53] text-[11px] mt-0.5">Attempt {job.attempts} of {job.maxAttempts}</p>
                  
                  {job.status === 'FAILED' && job.attempts < job.maxAttempts && (
                    <button
                      onClick={() => retryMutation.mutate(job.id)}
                      disabled={retryMutation.isPending}
                      className="btn-primary mt-2 text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      {retryMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Retry Job
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
