"use client"

import { useState } from 'react'
import { 
  ZohoLayout, 
  ZohoCard, 
  ZohoButton,
  ZohoBadge 
} from '../components/zoho-ui'
import { 
  Cpu,
  Settings,
  Activity,
  Power,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Wrench
} from 'lucide-react'
import { ProtectedPage } from '@/components/auth/ProtectedPage'

interface Machine {
  id: string
  name: string
  status: 'active' | 'idle' | 'maintenance' | 'offline'
  utilization: number
  currentTask: string | null
  uptime: string
}

function MachinesPageContent() {
  const [machines] = useState<Machine[]>([
    { id: '1', name: 'VMC 1', status: 'active', utilization: 95, currentTask: 'Part PN-001', uptime: '8h 45m' },
    { id: '2', name: 'VMC 2', status: 'active', utilization: 87, currentTask: 'Part PN-002', uptime: '8h 30m' },
    { id: '3', name: 'VMC 3', status: 'active', utilization: 79, currentTask: 'Part PN-003', uptime: '8h 15m' },
    { id: '4', name: 'VMC 4', status: 'idle', utilization: 0, currentTask: null, uptime: '0h 0m' },
    { id: '5', name: 'VMC 5', status: 'active', utilization: 63, currentTask: 'Part PN-005', uptime: '7h 20m' },
    { id: '6', name: 'VMC 6', status: 'active', utilization: 55, currentTask: 'Part PN-006', uptime: '6h 45m' },
    { id: '7', name: 'VMC 7', status: 'maintenance', utilization: 0, currentTask: null, uptime: '0h 0m' },
    { id: '8', name: 'VMC 8', status: 'active', utilization: 39, currentTask: 'Part PN-008', uptime: '5h 10m' },
    { id: '9', name: 'VMC 9', status: 'maintenance', utilization: 0, currentTask: null, uptime: '0h 0m' },
    { id: '10', name: 'VMC 10', status: 'offline', utilization: 0, currentTask: null, uptime: '0h 0m' },
  ])

  const getStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' => {
    switch (status) {
      case 'active': return 'success'
      case 'idle': return 'neutral'
      case 'maintenance': return 'warning'
      case 'offline': return 'danger'
      default: return 'neutral'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'idle': return <Clock className="w-4 h-4" />
      case 'maintenance': return <Wrench className="w-4 h-4" />
      case 'offline': return <AlertCircle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const activeMachines = machines.filter(m => m.status === 'active').length
  const avgUtilization = Math.round(machines.reduce((acc, m) => acc + m.utilization, 0) / machines.length)

  return (
    <ZohoLayout breadcrumbs={[
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Machines' }
    ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
              <Cpu className="w-6 h-6 text-[#2C7BE5]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#12263F] dark:text-white">Machine Management</h1>
              <p className="text-[#95AAC9] mt-1">Monitor and manage production machines</p>
            </div>
          </div>
          <ZohoButton
            variant="primary"
            icon={<Settings className="w-4 h-4" />}
          >
            Machine Settings
          </ZohoButton>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#95AAC9] mb-1">Total Machines</p>
                <p className="text-2xl font-bold text-[#12263F] dark:text-white">{machines.length}</p>
              </div>
              <div className="w-10 h-10 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#2C7BE5]" />
              </div>
            </div>
          </ZohoCard>

          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#95AAC9] mb-1">Active Machines</p>
                <p className="text-2xl font-bold text-[#28A745]">{activeMachines}</p>
              </div>
              <div className="w-10 h-10 bg-[#28A745]/10 rounded-lg flex items-center justify-center">
                <Power className="w-5 h-5 text-[#28A745]" />
              </div>
            </div>
          </ZohoCard>

          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#95AAC9] mb-1">Avg Utilization</p>
                <p className="text-2xl font-bold text-[#2C7BE5]">{avgUtilization}%</p>
              </div>
              <div className="w-10 h-10 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#2C7BE5]" />
              </div>
            </div>
          </ZohoCard>

          <ZohoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#95AAC9] mb-1">Maintenance</p>
                <p className="text-2xl font-bold text-[#FD7E14]">{machines.filter(m => m.status === 'maintenance').length}</p>
              </div>
              <div className="w-10 h-10 bg-[#FD7E14]/10 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-[#FD7E14]" />
              </div>
            </div>
          </ZohoCard>
        </div>

        {/* Machine Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <ZohoCard key={machine.id}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2C7BE5]/10 rounded-lg flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-[#2C7BE5]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#12263F] dark:text-white">{machine.name}</h3>
                      <p className="text-xs text-[#95AAC9]">Machine ID: {machine.id}</p>
                    </div>
                  </div>
                  <ZohoBadge variant={getStatusColor(machine.status)} size="sm">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(machine.status)}
                      <span className="capitalize">{machine.status}</span>
                    </div>
                  </ZohoBadge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#95AAC9]">Utilization</span>
                    <span className="font-semibold text-[#12263F] dark:text-white">{machine.utilization}%</span>
                  </div>
                  <div className="w-full bg-[#E3E6F0] dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-[#2C7BE5] h-2 rounded-full transition-all"
                      style={{ width: `${machine.utilization}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#95AAC9]">Current Task</span>
                    <span className="font-medium text-[#12263F] dark:text-white">
                      {machine.currentTask || 'None'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#95AAC9]">Uptime</span>
                    <span className="font-medium text-[#12263F] dark:text-white">{machine.uptime}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <ZohoButton variant="secondary" size="sm" className="flex-1">
                    View Details
                  </ZohoButton>
                  <ZohoButton variant="ghost" size="sm" icon={<Settings className="w-4 h-4" />} />
                </div>
              </div>
            </ZohoCard>
          ))}
        </div>
      </div>
    </ZohoLayout>
  )
}

export default function MachinesPage() {
  return (
    <ProtectedPage module="production" item="Machines" permission="view">
      <MachinesPageContent />
    </ProtectedPage>
  )
}
