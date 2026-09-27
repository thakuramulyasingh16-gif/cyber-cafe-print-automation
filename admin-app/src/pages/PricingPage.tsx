import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getPricing, updatePricing } from '../lib/api'
import { Save, Loader2, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type PriceEntry = {
  paperSize: string
  colorMode: string
  pricePerPage: number
  isActive: boolean
}

const DEFAULT_RULES: PriceEntry[] = [
  { paperSize: 'A4', colorMode: 'BW', pricePerPage: 2, isActive: true },
  { paperSize: 'A4', colorMode: 'COLOR', pricePerPage: 10, isActive: true },
  { paperSize: 'A3', colorMode: 'BW', pricePerPage: 4, isActive: true },
  { paperSize: 'A3', colorMode: 'COLOR', pricePerPage: 20, isActive: true },
  { paperSize: 'LETTER', colorMode: 'BW', pricePerPage: 2, isActive: true },
  { paperSize: 'LETTER', colorMode: 'COLOR', pricePerPage: 10, isActive: true },
]

export default function PricingPage() {
  const [editedRules, setEditedRules] = useState<PriceEntry[] | null>(null)

  const { data: rules, isLoading } = useQuery({
    queryKey: ['pricing'],
    queryFn: getPricing,
  })

  // Initialize editedRules from server data on first load
  if (rules && !editedRules) {
    const merged = DEFAULT_RULES.map(d => {
      const found = rules.find((r: PriceEntry) => r.paperSize === d.paperSize && r.colorMode === d.colorMode)
      return found ? { ...d, ...found } : d
    })
    setEditedRules(merged)
  }

  const updateMutation = useMutation({
    mutationFn: updatePricing,
    onSuccess: () => toast.success('Pricing updated successfully!'),
    onError: (err: Error) => toast.error(err.message),
  })

  const displayRules: PriceEntry[] = editedRules || DEFAULT_RULES

  const updateRule = (index: number, field: keyof PriceEntry, value: number | boolean) => {
    const updated = [...displayRules]
    updated[index] = { ...updated[index], [field]: value }
    setEditedRules(updated)
  }

  const handleSave = () => {
    updateMutation.mutate(displayRules)
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#fdf7f0] tracking-tight">Print Pricing Matrix</h1>
        <p className="text-[#a88a74] text-sm mt-1">Configure price per page (₹) for paper size and color configurations</p>
      </div>

      {/* Pricing Table Card */}
      <div className="card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#3e271a] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#d97706] flex items-center justify-center text-[#241308] shadow-sm">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#fef5ec]">Rate Configuration</h2>
            <p className="text-[11px] text-[#8c6b53]">Affects all new incoming customer orders instantly</p>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-[#332014]">
            {displayRules.map((rule, i) => (
              <div key={`${rule.paperSize}-${rule.colorMode}`} className="p-4 sm:p-5 flex items-center gap-4 hover:bg-[#2b1b11]/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#fdf7f0] font-black text-base">{rule.paperSize}</span>
                    <span className={clsx(
                      'text-xs font-bold px-2.5 py-0.5 rounded-full clay-pill',
                      rule.colorMode === 'BW' 
                        ? 'bg-[#26180f] text-[#c4a692] border border-[#442c1e]' 
                        : 'bg-[#3b2718] text-amber-300 border border-amber-500/40'
                    )}>
                      {rule.colorMode === 'BW' ? 'Black & White' : 'Full Color'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-primary-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={rule.pricePerPage}
                    onChange={e => updateRule(i, 'pricePerPage', parseFloat(e.target.value) || 0)}
                    className="input-field w-24 text-center font-bold text-primary-400 py-1.5"
                  />
                  <span className="text-[#8c6b53] text-xs font-semibold">/page</span>
                </div>
                
                {/* Clay Toggle Switch */}
                <button
                  onClick={() => updateRule(i, 'isActive', !rule.isActive)}
                  className={clsx(
                    'w-12 h-7 rounded-full transition-all duration-200 relative p-1 shadow-inner border',
                    rule.isActive 
                      ? 'bg-gradient-to-r from-amber-500 to-primary-600 border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                      : 'bg-[#29190f] border-[#442c1e]'
                  )}
                  title={rule.isActive ? 'Active rule' : 'Inactive rule'}
                >
                  <div className={clsx(
                    'w-5 h-5 bg-gradient-to-b from-white to-[#fde68a] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-200',
                    rule.isActive ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="btn-primary text-sm px-6 py-3 flex items-center gap-2"
          id="save-pricing-btn"
        >
          {updateMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving Rates...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Pricing Changes</>
          )}
        </button>
        <p className="text-[#8c6b53] text-xs font-semibold">
          Updates take effect immediately on customer checkout
        </p>
      </div>
    </div>
  )
}
