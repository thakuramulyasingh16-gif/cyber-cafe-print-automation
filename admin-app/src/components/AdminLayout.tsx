import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { io } from 'socket.io-client'
import {
  LayoutDashboard, ShoppingBag, Printer, DollarSign,
  Settings, LogOut, QrCode, ListOrdered
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/print-queue', icon: ListOrdered, label: 'Print Queue' },
  { to: '/pricing', icon: DollarSign, label: 'Pricing' },
  { to: '/printers', icon: Printer, label: 'Printers' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout() {
  const { user, token, logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Socket.IO connection for realtime updates
  useEffect(() => {
    if (!token) return

    const socket = io('http://localhost:3001')
    socket.emit('authenticate', token)

    socket.on('order:new', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socket.on('order:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socket.on('printjob:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['print-queue'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socket.on('dashboard:refresh', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    return () => { socket.disconnect() }
  }, [token, queryClient])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-[#140c07] text-[#fbf5ee] overflow-hidden relative">
      {/* Soft Ambient Background Saffron Glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[400px] bg-gradient-to-b from-primary-500/5 to-transparent blur-3xl pointer-events-none z-0" />

      {/* Sidebar with Claymorphic Container */}
      <aside className="w-64 bg-gradient-to-b from-[#21150d] to-[#190f09] border-r border-[#3e271a] flex flex-col flex-shrink-0 z-20 shadow-[8px_0_24px_rgba(10,5,2,0.5)]">
        {/* Brand Header */}
        <div className="p-6 border-b border-[#3e271a]/80">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#d97706] p-0.5 shadow-[0_4px_14px_rgba(217,119,6,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.4)] flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-[#f59e0b] to-[#b45309] flex items-center justify-center">
                <Printer className="w-5 h-5 text-[#241308]" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-[#fdf7f0] tracking-tight">Print Hub</p>
              <p className="text-xs text-primary-400 font-bold uppercase tracking-wider">Admin Console</p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          
          <div className="pt-3 border-t border-[#3e271a]/80 mt-3">
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-link hover:text-primary-300"
            >
              <QrCode className="w-4 h-4 flex-shrink-0 text-primary-400" />
              <span>Customer Portal ↗</span>
            </a>
          </div>
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-[#3e271a]/80 space-y-2 bg-[#1b100a]/60">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#26170e] border border-[#442c1d] shadow-[inset_0_1px_2px_rgba(255,230,200,0.05),0_2px_8px_rgba(0,0,0,0.3)]">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#d97706] flex items-center justify-center text-xs font-black text-[#241308] shadow-[0_2px_6px_rgba(217,119,6,0.3)] flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#fef5ec] truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[11px] text-[#a88a74] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-300 hover:text-white bg-[#2e1615] hover:bg-[#3d1a19] border border-rose-900/40 hover:border-rose-700/60 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
