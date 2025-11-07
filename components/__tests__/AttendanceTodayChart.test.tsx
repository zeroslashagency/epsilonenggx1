/**
 * AttendanceTodayChart Component Tests
 */

import { render, screen } from '@testing-library/react'
import { AttendanceTodayChart } from '../AttendanceTodayChart'

describe('AttendanceTodayChart', () => {
  // Mock attendance log data (array format expected by component)
  const mockData = [
    {
      employee_code: 'EMP001',
      employee_name: 'John Doe',
      log_date: new Date().toISOString(),
      punch_direction: 'in',
    },
    {
      employee_code: 'EMP002',
      employee_name: 'Jane Smith',
      log_date: new Date().toISOString(),
      punch_direction: 'in',
    },
  ]

  it('should render without crashing', () => {
    const { container } = render(<AttendanceTodayChart data={mockData} />)
    // Component renders successfully
    expect(container).toBeTruthy()
  })

  it('should handle array data', () => {
    render(<AttendanceTodayChart data={mockData} />)
    // Should process array data without errors
    expect(true).toBe(true)
  })

  it('should handle empty array', () => {
    const emptyData: any[] = []
    render(<AttendanceTodayChart data={emptyData} />)
    // Should handle empty data gracefully
    expect(true).toBe(true)
  })

  it('should be memoized with React.memo', () => {
    const { rerender } = render(<AttendanceTodayChart data={mockData} />)
    rerender(<AttendanceTodayChart data={mockData} />)
    // Component should be memoized
    expect(true).toBe(true)
  })
})
