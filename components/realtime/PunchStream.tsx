
"use client"

import { useState, useEffect, useRef } from 'react'
import { PunchReceipt } from './PunchReceipt'

export interface Punch {
    id: string
    employee_code: string
    employee_name: string // We might need to fetch this if payload only has code
    punch_direction: string
    log_date: string
}

interface PunchStreamProps {
    newPunch: Punch | null
}

export function PunchStream({ newPunch }: PunchStreamProps) {
    const [queue, setQueue] = useState<Punch[]>([])
    const processedRef = useRef<Set<string>>(new Set())

    // Play sound
    const playSound = () => {
        try {
            // Check if audio file exists implicitly by only playing if not errored
            const audio = new Audio('/sounds/receipt-print.mp3')
            audio.volume = 0.5
            const playPromise = audio.play()

            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    // Silence "Not Allowed" errors which are common without user interaction
                    if (e.name !== 'NotAllowedError') {
                        console.log('Audio playback skipped (likely missing file or blocked)', e.message)
                    }
                })
            }
        } catch (err) {
            // Silently fail if audio system isn't available
        }
    }

    useEffect(() => {
        if (newPunch && !processedRef.current.has(newPunch.id)) {
            processedRef.current.add(newPunch.id)

            // Add to queue
            setQueue(prev => [newPunch, ...prev].slice(0, 5)) // Keep max 5 visible

            // Play Sound
            playSound()

            // Remove after 6 seconds
            setTimeout(() => {
                setQueue(prev => prev.filter(p => p.id !== newPunch.id))
                processedRef.current.delete(newPunch.id) // Optional: clean up set
            }, 6000)
        }
    }, [newPunch])

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none">
            {/* Printer Machine Visual */}
            <div className="relative w-72 h-12 bg-gray-900 rounded-b-xl shadow-2xl flex items-end justify-center pb-2 border-b-4 border-gray-800 z-[60]">
                <div className="w-64 h-1 bg-black rounded-full/50 shadow-inner" />
                {/* Status Light */}
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <div className="absolute top-4 left-4 flex gap-1">
                    <div className="w-8 h-1 bg-gray-700 rounded-full" />
                    <div className="w-4 h-1 bg-gray-700 rounded-full" />
                </div>
            </div>

            {/* Receipt Stream */}
            <div className="flex flex-col items-center -mt-1 space-y-reverse space-y-4">
                {queue.map((punch, index) => (
                    <div
                        key={punch.id}
                        className="animate-in slide-in-from-top-12 duration-[2000ms] ease-out pt-2"
                        style={{ zIndex: 50 - index }} // Stack correctly
                    >
                        <PunchReceipt
                            employeeName={punch.employee_name || `Employee ${punch.employee_code}`}
                            employeeCode={punch.employee_code}
                            time={new Date(punch.log_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            type={punch.punch_direction as 'in' | 'out'}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
