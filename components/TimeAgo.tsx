
"use client"

import { useState, useEffect } from 'react'

interface TimeAgoProps {
    date: string | Date
}

export function TimeAgo({ date }: TimeAgoProps) {
    const [timeAgo, setTimeAgo] = useState('')

    useEffect(() => {
        const calculateTimeAgo = () => {
            const logTime = new Date(date)
            const now = new Date()
            const diffMs = now.getTime() - logTime.getTime()

            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMins / 60)
            const diffDays = Math.floor(diffHours / 24)

            if (diffDays > 0) {
                setTimeAgo(`${diffDays}d ago`)
            } else if (diffHours > 0) {
                setTimeAgo(`${diffHours}h ago`)
            } else if (diffMins > 0) {
                setTimeAgo(`${diffMins}m ago`)
            } else {
                setTimeAgo('Just now')
            }
        }

        calculateTimeAgo()
        // Update every 30 seconds
        const interval = setInterval(calculateTimeAgo, 30000)

        return () => clearInterval(interval)
    }, [date])

    return <span>{timeAgo}</span>
}
