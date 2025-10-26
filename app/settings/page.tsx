"use client"

import { useState } from 'react'
import { 
  ChevronRight, 
  ChevronDown,
  Search,
  Building2,
  Users,
  Shield,
  Bell,
  Palette,
  Plug,
  BarChart3,
  Settings as SettingsIcon
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SettingsSection {
  id: string
  title: string
  icon: any
  items: Array<{
    id: string
    label: string
    href: string
  }>
}

const settingsSections: SettingsSection[] = [
  {
    id: 'organization',
    title: 'ORGANIZATION SETTINGS',
    icon: Building2,
    items: [
      { id: 'org', label: 'Organization', href: '/settings/organization' },
      { id: 'users-roles', label: 'Users & Roles', href: '/settings/roles' },
      { id: 'users', label: 'Users', href: '/settings/users' },
      { id: 'roles', label: 'Roles', href: '/settings/roles' },
      { id: 'user-prefs', label: 'User Preferences', href: '/settings/user-preferences' }
    ]
  },
  {
    id: 'taxes',
    title: 'TAXES & COMPLIANCE',
    icon: Shield,
    items: [
      { id: 'taxes', label: 'Taxes & Compliance', href: '/settings/taxes' }
    ]
  },
  {
    id: 'setup',
    title: 'SETUP & CONFIGURATIONS',
    icon: SettingsIcon,
    items: [
      { id: 'setup', label: 'Setup & Configurations', href: '/settings/setup' }
    ]
  },
  {
    id: 'customization',
    title: 'CUSTOMIZATION',
    icon: Palette,
    items: [
      { id: 'custom', label: 'Customization', href: '/settings/customization' }
    ]
  },
  {
    id: 'automation',
    title: 'AUTOMATION',
    icon: Plug,
    items: [
      { id: 'automation', label: 'Automation', href: '/settings/automation' }
    ]
  },
  {
    id: 'modules',
    title: 'MODULE SETTINGS',
    icon: BarChart3,
    items: [
      { id: 'general', label: 'General', href: '/settings/general' },
      { id: 'online-payments', label: 'Online Payments', href: '/settings/online-payments' },
      { id: 'sales', label: 'Sales', href: '/settings/sales' },
      { id: 'purchases', label: 'Purchases', href: '/settings/purchases' },
      { id: 'custom-modules', label: 'Custom Modules', href: '/settings/custom-modules' }
    ]
  }
]

export default function SettingsPage() {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(['organization'])
  const [searchQuery, setSearchQuery] = useState('')

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-[#E3E6F0] dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#E3E6F0] dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <button className="p-1 hover:bg-[#F8F9FC] dark:hover:bg-gray-800 rounded">
              <ChevronRight className="w-5 h-5 text-[#95AAC9]" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#12263F] dark:text-white">All Settings</h1>
              <p className="text-xs text-[#95AAC9]">xoxo</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {settingsSections.map((section) => (
            <div key={section.id} className="mb-1">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#95AAC9] hover:bg-[#F8F9FC] dark:hover:bg-gray-800 rounded transition-colors"
              >
                <span>{section.title}</span>
                {expandedSections.includes(section.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {expandedSections.includes(section.id) && (
                <div className="mt-1 space-y-0.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`
                        block px-3 py-2 text-sm rounded transition-colors
                        ${pathname === item.href
                          ? 'bg-[#2C7BE5] text-white font-medium'
                          : 'text-[#12263F] dark:text-gray-300 hover:bg-[#F8F9FC] dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Search Bar */}
        <div className="p-4 border-b border-[#E3E6F0] dark:border-gray-700">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#95AAC9]" />
            <input
              type="text"
              placeholder="Search settings ( / )"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-10 pr-4 py-2
                bg-[#F8F9FC] dark:bg-gray-800
                border border-[#E3E6F0] dark:border-gray-700
                rounded-[4px] text-sm
                text-[#12263F] dark:text-white
                placeholder-[#95AAC9]
                focus:outline-none focus:ring-2 focus:ring-[#2C7BE5] focus:border-transparent
              "
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          {/* This will be replaced by child routes */}
          <div className="text-center py-12 text-[#95AAC9]">
            Select a setting from the sidebar
          </div>
        </div>
      </main>
    </div>
  )
}
