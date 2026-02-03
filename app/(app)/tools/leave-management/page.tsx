"use client"

import { useState, useEffect } from 'react'
import PermissionGuard from '@/app/components/auth/PermissionGuard'

import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus, User, FileText } from 'lucide-react'

interface LeaveType {
  id: string
  name: string
  code: string
  color: string
  max_days_per_year: number
}

interface LeaveBalance {
  id: string
  allocated_days: number
  used_days: number
  pending_days: number
  remaining_days: number
  leave_type: LeaveType
}

interface LeaveRequest {
  id: string
  employee_code: string
  start_date: string
  end_date: string
  total_days: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  leave_type: LeaveType
  requester?: { full_name: string }
  approver?: { full_name: string }
  rejected_reason?: string
  comments?: string
}

export default function LeaveManagementPage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'balances' | 'create'>('requests')
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    fetchData()
  }, [activeTab, statusFilter])

  async function fetchData() {
    try {
      setLoading(true)

      if (activeTab === 'requests') {
        await fetchRequests()
      } else if (activeTab === 'balances') {
        await fetchBalances()
      }

      if (activeTab === 'create' || activeTab === 'balances') {
        await fetchLeaveTypes()
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRequests() {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.append('status', statusFilter)

    const response = await fetch(`/api/leave-requests?${params}`)
    const result = await response.json()

    if (result.success) {
      setRequests(result.data)
    }
  }

  async function fetchBalances() {
    const response = await fetch('/api/leave-balances')
    const result = await response.json()

    if (result.success) {
      setBalances(result.data)
    }
  }

  async function fetchLeaveTypes() {
    const { data } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (data) setLeaveTypes(data)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    const icons = {
      pending: <AlertCircle className="w-4 h-4" />,
      approved: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <PermissionGuard module="tools_leave" item="Leave Management">
      <div className="space-y-6 p-6">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage leave requests, balances, and approvals</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'requests', label: 'Leave Requests', icon: FileText },
                { id: 'balances', label: 'Leave Balances', icon: Calendar },
                { id: 'create', label: 'New Request', icon: Plus }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Requests</h2>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="all">All Requests</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No leave requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {request.employee_code}
                            </h3>
                            {getStatusBadge(request.status)}
                            <div
                              className="px-3 py-1 rounded-full text-sm font-medium text-white"
                              style={{ backgroundColor: request.leave_type.color }}
                            >
                              {request.leave_type.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {request.requester?.full_name || 'Unknown'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {request.total_days} day{request.total_days !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {request.status === 'pending' && (
                          <button
                            onClick={() => {
                              setSelectedRequest(request)
                              setShowApprovalModal(true)
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Review
                          </button>
                        )}
                      </div>

                      {request.reason && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Reason</h4>
                          <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            {request.reason}
                          </p>
                        </div>
                      )}

                      {(request.comments || request.rejected_reason) && (
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            {request.status === 'rejected' ? 'Rejection Reason' : 'Comments'}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            {request.rejected_reason || request.comments}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Balances Tab */}
          {activeTab === 'balances' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Balances</h2>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading balances...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {balances.map((balance) => (
                    <div
                      key={balance.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {balance.leave_type.name}
                        </h3>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: balance.leave_type.color }}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Allocated</span>
                          <span className="font-medium">{balance.allocated_days} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Used</span>
                          <span className="font-medium text-red-600">{balance.used_days} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Pending</span>
                          <span className="font-medium text-yellow-600">{balance.pending_days} days</span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-gray-600 dark:text-gray-400">Remaining</span>
                          <span className="font-bold text-green-600">{balance.remaining_days} days</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (balance.used_days / balance.allocated_days) * 100)}%`,
                              backgroundColor: balance.leave_type.color
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Request Tab */}
          {activeTab === 'create' && (
            <LeaveRequestForm
              leaveTypes={leaveTypes}
              onSuccess={() => {
                setActiveTab('requests')
                fetchRequests()
              }}
            />
          )}

          {/* Approval Modal */}
          {showApprovalModal && selectedRequest && (
            <LeaveApprovalModal
              request={selectedRequest}
              onClose={() => {
                setShowApprovalModal(false)
                setSelectedRequest(null)
              }}
              onApprove={() => {
                fetchRequests()
                setShowApprovalModal(false)
                setSelectedRequest(null)
              }}
            />
          )}
        </div>
      </div>
    </PermissionGuard>
  )
}

function LeaveRequestForm({ leaveTypes, onSuccess }: {
  leaveTypes: LeaveType[]
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    employeeCode: '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    emergencyContact: ''
  })
  const [loading, setLoading] = useState(false)

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      const totalDays = calculateDays()

      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalDays
        })
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
        setFormData({
          employeeCode: '',
          leaveTypeId: '',
          startDate: '',
          endDate: '',
          reason: '',
          emergencyContact: ''
        })
      } else {
        alert(`Failed to create request: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating request:', error)
      alert('Failed to create leave request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Create Leave Request</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Employee Code *
            </label>
            <input
              type="text"
              value={formData.employeeCode}
              onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Leave Type *
            </label>
            <select
              value={formData.leaveTypeId}
              onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              required
            />
          </div>
        </div>

        {formData.startDate && formData.endDate && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Total days: {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            rows={3}
            placeholder="Reason for leave..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Emergency Contact
          </label>
          <input
            type="text"
            value={formData.emergencyContact}
            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            placeholder="Emergency contact information"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating Request...' : 'Create Leave Request'}
        </button>
      </form>
    </div>
  )
}

function LeaveApprovalModal({ request, onClose, onApprove }: {
  request: LeaveRequest
  onClose: () => void
  onApprove: () => void
}) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [comments, setComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!action) return

    try {
      setLoading(true)
      const endpoint = action === 'approve' ? 'approve' : 'reject'
      const body = action === 'approve'
        ? { comments }
        : { rejectedReason: rejectionReason, comments }

      const response = await fetch(`/api/leave-requests/${request.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (result.success) {
        onApprove()
      } else {
        alert(`Failed to ${action} request: ${result.error}`)
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error)
      alert(`Failed to ${action} request`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review Leave Request</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {request.employee_code} - {request.leave_type.name}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setAction('approve')}
              className={`p-4 rounded-lg border-2 transition-all ${action === 'approve'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                }`}
            >
              <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${action === 'approve' ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="font-medium">Approve</div>
            </button>

            <button
              onClick={() => setAction('reject')}
              className={`p-4 rounded-lg border-2 transition-all ${action === 'reject'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                }`}
            >
              <XCircle className={`w-8 h-8 mx-auto mb-2 ${action === 'reject' ? 'text-red-600' : 'text-gray-400'}`} />
              <div className="font-medium">Reject</div>
            </button>
          </div>

          {action === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                rows={3}
                placeholder="Please provide a reason for rejection..."
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              rows={3}
              placeholder="Additional comments..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!action || (action === 'reject' && !rejectionReason) || loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : action === 'approve' ? 'Approve Request' : 'Reject Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
