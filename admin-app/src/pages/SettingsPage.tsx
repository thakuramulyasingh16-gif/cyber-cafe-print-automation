import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getSettings, updateSettings, getQRCode } from '../lib/api'
import { Save, Loader2, QrCode, Download, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    cafeName: '',
    portalUrl: '',
    accentColor: '#f59e0b',
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: getSettings,
  })

  const { data: qrData } = useQuery({
    queryKey: ['qrcode'],
    queryFn: getQRCode,
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        cafeName: settings.cafeName || 'Cyber Cafe Print Hub',
        portalUrl: settings.portalUrl || 'http://localhost:5173',
        accentColor: settings.accentColor || '#f59e0b',
      })
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => toast.success('Settings saved successfully!'),
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  const handleDownloadQR = () => {
    if (!qrData?.qrCode) return
    const link = document.createElement('a')
    link.href = qrData.qrCode
    link.download = 'cybercafe-qrcode.png'
    link.click()
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#fdf7f0] tracking-tight">System Settings</h1>
        <p className="text-[#a88a74] text-sm mt-1">Configure cafe identity, customer portal URL, and QR code access</p>
      </div>

      <div className="space-y-6">
        {/* General Settings Card */}
        <div className="card p-6 sm:p-7 space-y-5">
          <h2 className="text-base font-bold text-[#fef5ec] border-b border-[#3e271a] pb-3">General Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a] mb-2 block">Cyber Cafe Name</label>
              <input
                type="text"
                value={formData.cafeName}
                onChange={e => setFormData({ ...formData, cafeName: e.target.value })}
                className="input-field"
                placeholder="Cyber Cafe Print Hub"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a] mb-2 block">Customer Portal URL</label>
              <input
                type="url"
                value={formData.portalUrl}
                onChange={e => setFormData({ ...formData, portalUrl: e.target.value })}
                className="input-field"
                placeholder="http://localhost:5173"
              />
              <p className="text-[#8c6b53] text-[11px] mt-1 font-medium">This web address is encoded directly into the customer QR code</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a] mb-2 block">Brand Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.accentColor}
                  onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                  className="w-12 h-11 rounded-2xl cursor-pointer border border-[#442c1e] bg-[#180e08] p-1"
                />
                <input
                  type="text"
                  value={formData.accentColor}
                  onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                  className="input-field font-mono"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="btn-primary text-sm px-6 py-3 flex items-center gap-2 mt-4"
          >
            {updateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving Configuration...</>
            ) : (
              <><Save className="w-4 h-4" /> Save Settings</>
            )}
          </button>
        </div>

        {/* QR Code Presentation Card */}
        <div className="card p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#3e271a] pb-3">
            <QrCode className="w-5 h-5 text-primary-400" />
            <h2 className="text-base font-bold text-[#fef5ec]">Customer Portal QR Code</h2>
          </div>
          <p className="text-[#c4a692] text-xs leading-relaxed">
            Print and place this QR code on the cyber cafe counter or walls. Customers scan it with any smartphone camera to open the print upload portal instantly.
          </p>
          
          {qrData?.qrCode ? (
            <div className="flex flex-col items-center gap-4 pt-3">
              <div className="bg-[#fdfaf5] p-5 rounded-3xl shadow-[0_8px_24px_rgba(10,5,2,0.5),inset_0_2px_4px_rgba(0,0,0,0.06)] border-4 border-[#3e271a]">
                <img src={qrData.qrCode} alt="Customer Portal QR Code" className="w-48 h-48 sm:w-56 sm:h-56" />
              </div>
              <p className="text-primary-400 font-mono text-xs font-bold bg-[#180e08] px-4 py-2 rounded-xl border border-[#3e271a]">
                {qrData.url}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadQR}
                  className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download QR Image
                </button>
                <a
                  href={qrData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs px-4 py-2.5 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" /> Open Portal ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            </div>
          )}
        </div>

        {/* System Information Card */}
        <div className="card p-6 sm:p-7 space-y-3 bg-gradient-to-b from-[#25170f] to-[#1a1009]">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#fdf7f0]">Deployment System Endpoints</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#332014]">
              <span className="text-[#a88a74]">Customer Portal</span>
              <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer" className="text-primary-400 font-bold hover:underline">localhost:5173</a>
            </div>
            <div className="flex justify-between py-1 border-b border-[#332014]">
              <span className="text-[#a88a74]">Admin Dashboard</span>
              <span className="text-[#fdf7f0] font-semibold">localhost:5174</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#332014]">
              <span className="text-[#a88a74]">Backend API</span>
              <span className="text-[#fdf7f0] font-semibold">localhost:3001</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#a88a74]">Print Agent Status</span>
              <span className="text-emerald-400 font-bold">Authenticated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
