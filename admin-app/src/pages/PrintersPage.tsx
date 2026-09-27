import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPrinters, addPrinter } from '../lib/api'
import { Printer, Plus, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function PrintersPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [newPrinterName, setNewPrinterName] = useState('')
  const [newPrinterDisplay, setNewPrinterDisplay] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const queryClient = useQueryClient()

  const { data: printers = [], isLoading } = useQuery({
    queryKey: ['printers'],
    queryFn: getPrinters,
  })

  const addMutation = useMutation({
    mutationFn: addPrinter,
    onSuccess: () => {
      toast.success('Printer added successfully')
      setShowAdd(false)
      setNewPrinterName('')
      setNewPrinterDisplay('')
      setIsDefault(false)
      queryClient.invalidateQueries({ queryKey: ['printers'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleAdd = () => {
    if (!newPrinterName.trim() || !newPrinterDisplay.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    addMutation.mutate({ name: newPrinterName.trim(), displayName: newPrinterDisplay.trim(), isDefault })
  }

  const printerStatusColor: Record<string, string> = {
    ONLINE: 'text-emerald-400',
    OFFLINE: 'text-rose-400',
    ERROR: 'text-rose-400',
    UNKNOWN: 'text-[#8c6b53]',
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#fdf7f0] tracking-tight">Connected Printers</h1>
          <p className="text-[#a88a74] text-sm mt-1">Configure hardware printer destinations for the Windows print agent</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add New Printer
        </button>
      </div>

      {/* Add Printer Modal / Card */}
      {showAdd && (
        <div className="card p-6 sm:p-7 space-y-5 border-2 border-primary-500/40 bg-gradient-to-b from-[#301f14] to-[#20140c]">
          <h2 className="text-base font-bold text-[#fef5ec]">Add New Physical Printer</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a] mb-2 block">
                Windows Printer System Name
              </label>
              <input
                type="text"
                value={newPrinterName}
                onChange={e => setNewPrinterName(e.target.value)}
                className="input-field"
                placeholder="e.g., EPSON_L3250_Series or HP_LaserJet_1102"
              />
              <p className="text-[#8c6b53] text-[11px] mt-1 font-medium">Exact device name as shown in Windows "Printers & Scanners"</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a] mb-2 block">
                Friendly Display Name
              </label>
              <input
                type="text"
                value={newPrinterDisplay}
                onChange={e => setNewPrinterDisplay(e.target.value)}
                className="input-field"
                placeholder="e.g., Counter Main LaserJet"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setIsDefault(!isDefault)}
                className={clsx(
                  'w-12 h-7 rounded-full transition-all duration-200 relative p-1 shadow-inner border',
                  isDefault 
                    ? 'bg-gradient-to-r from-amber-500 to-primary-600 border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                    : 'bg-[#29190f] border-[#442c1e]'
                )}
              >
                <div className={clsx(
                  'w-5 h-5 bg-gradient-to-b from-white to-[#fde68a] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-200',
                  isDefault ? 'translate-x-5' : 'translate-x-0'
                )} />
              </button>
              <span className="text-sm font-semibold text-[#fdf7f0]">Set as default printer for automatic jobs</span>
            </div>
            <div className="flex gap-3 pt-3">
              <button
                onClick={handleAdd}
                disabled={addMutation.isPending}
                className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2"
              >
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Printer
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-secondary text-xs px-4 py-2.5">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printers List */}
      <div className="card divide-y divide-[#332014] overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : printers.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#28180f] border border-[#3e271a] flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Printer className="w-8 h-8 text-[#6d4d38]" />
            </div>
            <p className="text-[#fef5ec] font-bold">No printers registered yet</p>
            <p className="text-[#8c6b53] text-xs mt-1">Click "Add New Printer" above to configure your cafe printer.</p>
          </div>
        ) : (
          printers.map((printer: {
            id: string
            name: string
            displayName: string
            isDefault: boolean
            isActive: boolean
            status: string
            lastSeen: string | null
          }) => (
            <div key={printer.id} className="p-5 sm:p-6 flex items-center gap-4 hover:bg-[#2b1b11]/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3b2518] to-[#25170f] border border-[#523523] flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(10,5,2,0.4)]">
                <Printer className="w-6 h-6 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <p className="text-[#fdf7f0] font-black text-base">{printer.displayName}</p>
                  {printer.isDefault && (
                    <span className="badge badge-yellow text-[11px]">Default Printer</span>
                  )}
                </div>
                <p className="text-[#8c6b53] text-xs font-mono">{printer.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {printer.status === 'ONLINE' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : printer.status === 'OFFLINE' || printer.status === 'ERROR' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                ) : null}
                <span className={clsx('text-xs font-bold uppercase tracking-wider', printerStatusColor[printer.status] || 'text-[#8c6b53]')}>
                  {printer.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Print Agent Info Card */}
      <div className="card p-6 sm:p-7 space-y-3.5 bg-gradient-to-b from-[#26180f] to-[#1c120a]">
        <h2 className="text-sm font-black uppercase tracking-wider text-primary-400 flex items-center gap-2">
          <span>🖨️</span> Windows Print Agent Setup Guide
        </h2>
        <p className="text-[#c4a692] text-xs leading-relaxed">
          The print agent service runs directly on your Windows PC and automatically routes jobs to your physical printer:
        </p>
        <div className="bg-[#140c07] rounded-2xl p-4 border border-[#3e271a] font-mono text-xs text-[#a88a74] space-y-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
          <p className="text-emerald-400">cd print-agent</p>
          <p className="text-primary-300">npm run dev</p>
        </div>
      </div>
    </div>
  )
}
