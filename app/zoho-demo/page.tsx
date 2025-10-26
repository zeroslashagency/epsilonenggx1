"use client"

import { ZohoLayout } from '../components/zoho-ui/ZohoLayout'
import { ZohoButton } from '../components/zoho-ui/ZohoButton'
import { ZohoCard, ZohoStatCard } from '../components/zoho-ui/ZohoCard'
import { ZohoInput, ZohoTextarea } from '../components/zoho-ui/ZohoInput'
import { 
  Plus, 
  Download, 
  Trash2, 
  Edit, 
  Users, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Factory
} from 'lucide-react'
import { ThemeProvider } from '../lib/contexts/theme-context'

export default function ZohoDemoPage() {
  return (
    <ThemeProvider>
      <ZohoLayout
        breadcrumbs={[
          { label: 'Demo', href: '/zoho-demo' },
          { label: 'Components' }
        ]}
      >
        <div className="space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Zoho UI Components Demo
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Preview of all Zoho-style components with dark/light mode support
            </p>
          </div>

          {/* Stat Cards */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Stat Cards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ZohoStatCard
                title="Total Employees"
                value="156"
                change="+12 this month"
                changeType="increase"
                icon={<Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                iconBg="bg-blue-100 dark:bg-blue-900/20"
              />
              <ZohoStatCard
                title="Present Today"
                value="142"
                change="91.0% ↗"
                changeType="increase"
                icon={<Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />}
                iconBg="bg-green-100 dark:bg-green-900/20"
              />
              <ZohoStatCard
                title="Late Arrivals"
                value="8"
                change="5.1% ↘"
                changeType="decrease"
                icon={<TrendingDown className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
                iconBg="bg-orange-100 dark:bg-orange-900/20"
              />
              <ZohoStatCard
                title="Machines Active"
                value="12/16"
                change="75% utilization"
                changeType="neutral"
                icon={<Factory className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                iconBg="bg-purple-100 dark:bg-purple-900/20"
              />
            </div>
          </div>

          {/* Buttons */}
          <ZohoCard title="Buttons" subtitle="All button variants and sizes">
            <div className="space-y-6">
              {/* Primary Buttons */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Primary Buttons
                </h3>
                <div className="flex flex-wrap gap-3">
                  <ZohoButton size="sm">Small Button</ZohoButton>
                  <ZohoButton size="md">Medium Button</ZohoButton>
                  <ZohoButton size="lg">Large Button</ZohoButton>
                  <ZohoButton icon={<Plus className="w-4 h-4" />}>
                    With Icon
                  </ZohoButton>
                  <ZohoButton loading>Loading...</ZohoButton>
                  <ZohoButton disabled>Disabled</ZohoButton>
                </div>
              </div>

              {/* Secondary Buttons */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Secondary Buttons
                </h3>
                <div className="flex flex-wrap gap-3">
                  <ZohoButton variant="secondary">Cancel</ZohoButton>
                  <ZohoButton variant="secondary" icon={<Download className="w-4 h-4" />}>
                    Download
                  </ZohoButton>
                  <ZohoButton variant="secondary" loading>Loading...</ZohoButton>
                </div>
              </div>

              {/* Danger Buttons */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Danger Buttons
                </h3>
                <div className="flex flex-wrap gap-3">
                  <ZohoButton variant="danger">Delete</ZohoButton>
                  <ZohoButton variant="danger" icon={<Trash2 className="w-4 h-4" />}>
                    Delete User
                  </ZohoButton>
                </div>
              </div>

              {/* Success Buttons */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Success Buttons
                </h3>
                <div className="flex flex-wrap gap-3">
                  <ZohoButton variant="success">Save</ZohoButton>
                  <ZohoButton variant="success" icon={<Plus className="w-4 h-4" />}>
                    Create New
                  </ZohoButton>
                </div>
              </div>

              {/* Ghost Buttons */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Ghost Buttons
                </h3>
                <div className="flex flex-wrap gap-3">
                  <ZohoButton variant="ghost">Ghost Button</ZohoButton>
                  <ZohoButton variant="ghost" icon={<Edit className="w-4 h-4" />}>
                    Edit
                  </ZohoButton>
                </div>
              </div>
            </div>
          </ZohoCard>

          {/* Form Inputs */}
          <ZohoCard title="Form Inputs" subtitle="Text inputs and textareas">
            <div className="space-y-6 max-w-2xl">
              <ZohoInput
                label="Full Name"
                placeholder="Enter your full name"
                required
                fullWidth
              />
              <ZohoInput
                label="Email Address"
                type="email"
                placeholder="john.doe@example.com"
                helperText="We'll never share your email with anyone"
                fullWidth
              />
              <ZohoInput
                label="Password"
                type="password"
                placeholder="Enter password"
                error="Password must be at least 8 characters"
                fullWidth
              />
              <ZohoInput
                label="Employee Code"
                placeholder="EMP-2025-001"
                disabled
                fullWidth
              />
              <ZohoTextarea
                label="Description"
                placeholder="Enter description..."
                helperText="Maximum 500 characters"
                rows={4}
                fullWidth
              />
            </div>
          </ZohoCard>

          {/* Cards */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Card Variants
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ZohoCard
                title="Simple Card"
                subtitle="With title and subtitle"
                padding="md"
              >
                <p className="text-gray-600 dark:text-gray-400">
                  This is a simple card with some content inside.
                </p>
              </ZohoCard>

              <ZohoCard
                title="Card with Actions"
                actions={
                  <>
                    <ZohoButton variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </ZohoButton>
                    <ZohoButton variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </ZohoButton>
                  </>
                }
              >
                <p className="text-gray-600 dark:text-gray-400">
                  This card has action buttons in the header.
                </p>
              </ZohoCard>

              <ZohoCard hoverable padding="md">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Hoverable Card
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Hover to see the effect
                  </p>
                </div>
              </ZohoCard>
            </div>
          </div>

          {/* Color Palette */}
          <ZohoCard title="Zoho Color Palette" subtitle="Primary colors used in the design">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="h-20 bg-blue-600 rounded-lg mb-2"></div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Primary Blue</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">#0E7EE6</p>
              </div>
              <div>
                <div className="h-20 bg-green-600 rounded-lg mb-2"></div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Success Green</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">#52C41A</p>
              </div>
              <div>
                <div className="h-20 bg-orange-500 rounded-lg mb-2"></div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Warning Orange</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">#FA8C16</p>
              </div>
              <div>
                <div className="h-20 bg-red-600 rounded-lg mb-2"></div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Danger Red</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">#F5222D</p>
              </div>
            </div>
          </ZohoCard>
        </div>
      </ZohoLayout>
    </ThemeProvider>
  )
}
