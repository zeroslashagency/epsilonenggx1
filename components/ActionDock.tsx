import React, { useState } from 'react'
import {
    Home,
    FileUp,
    Sparkles,
    ChevronDown,
    FileDown,
    PieChart,
    RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface ActionDockProps {
    resultsAvailable: boolean
    canGenerate: boolean
    canRunBasic?: boolean
    canRunAdvanced?: boolean
    onDashboard: () => void
    onImportExcel: () => void
    onGenerate: (mode: 'basic' | 'advanced') => void
    onExportExcel: () => void
    onChart: () => void
    onClear: () => void
}

export function ActionDock({
    resultsAvailable,
    canGenerate,
    canRunBasic = true,
    canRunAdvanced = true,
    onDashboard,
    onImportExcel,
    onGenerate,
    onExportExcel,
    onChart,
    onClear,
}: ActionDockProps) {
    const [mode, setMode] = useState<'basic' | 'advanced'>('advanced')
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const handleGenerateClick = () => {
        onGenerate(mode)
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 w-full max-w-fit overflow-visible">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-800 rounded-full px-4 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center gap-3 w-max mx-auto transition-all duration-300">

                {/* Dashboard */}
                <Button
                    onClick={onDashboard}
                    title="Dashboard"
                    className="bg-emerald-100/90 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/60 dark:text-emerald-300 rounded-full transition-all duration-300 hover:scale-105 border-0 shadow-none"
                >
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                </Button>

                {/* Import Excel */}
                <Button
                    onClick={onImportExcel}
                    title="Import Excel"
                    className="bg-blue-100/90 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:text-blue-300 rounded-full transition-all duration-300 hover:scale-105 border-0 shadow-none"
                >
                    <FileUp className="w-4 h-4 mr-2" />
                    Import Excel
                </Button>

                {/* Schedule Generate + Dropdown */}
                <div className="relative flex flex-col items-center">
                    {/* Floating Mode Badge */}
                    <div className="absolute bottom-full mb-3 origin-bottom transition-all duration-300 pointer-events-none drop-shadow-sm">
                        <Badge
                            variant="outline"
                            className={cn(
                                "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border relative",
                                mode === 'advanced'
                                    ? "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800"
                                    : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
                            )}
                        >
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full inline-block mr-1.5",
                                mode === 'advanced' ? "bg-purple-500" : "bg-emerald-500"
                            )} />
                            {mode === 'advanced' ? 'Advanced' : 'Basic'}
                            {/* Little triangle pointing down */}
                            <div className={cn(
                                "absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent",
                                mode === 'advanced'
                                    ? "border-t-purple-200 dark:border-t-purple-800"
                                    : "border-t-emerald-200 dark:border-t-emerald-800"
                            )} />
                        </Badge>
                    </div>

                    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                disabled={!canGenerate}
                                title="Schedule Generate Options"
                                className="bg-purple-100/90 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/40 dark:hover:bg-purple-800/60 dark:text-purple-300 rounded-full px-5 transition-all duration-300 hover:scale-[1.02] border-0 shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Schedule Generate
                                <ChevronDown className="w-4 h-4 ml-2 opacity-70" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="center" sideOffset={12} className="w-64 p-3 rounded-2xl shadow-xl border-slate-100/60 bg-white/95 dark:bg-slate-900/95 dark:border-slate-800 backdrop-blur-md z-[60]">
                            <DropdownMenuLabel className="px-1 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                Generation Mode
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="my-2 bg-slate-100 dark:bg-slate-800" />

                            <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'basic' | 'advanced')} className="gap-2">
                                <div className={cn("flex items-center space-x-2 rounded-xl p-2 transition-colors", canRunBasic ? "hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" : "opacity-50 cursor-not-allowed")}>
                                    <RadioGroupItem value="basic" id="mode-basic" disabled={!canRunBasic} className="border-slate-300 dark:border-slate-600 text-purple-500" />
                                    <Label htmlFor="mode-basic" className={cn("flex-1", canRunBasic ? "cursor-pointer" : "cursor-not-allowed")}>
                                        <div className="font-medium text-sm text-slate-700 dark:text-slate-200">Basic</div>
                                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Run Person only · No setup</div>
                                    </Label>
                                </div>
                                <div className={cn("flex items-center space-x-2 rounded-xl p-2 transition-colors", canRunAdvanced ? "hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer" : "opacity-50 cursor-not-allowed")}>
                                    <RadioGroupItem value="advanced" id="mode-advanced" disabled={!canRunAdvanced} className="border-slate-300 dark:border-slate-600 text-purple-500" />
                                    <Label htmlFor="mode-advanced" className={cn("flex-1", canRunAdvanced ? "cursor-pointer" : "cursor-not-allowed")}>
                                        <div className="font-medium text-sm text-slate-700 dark:text-slate-200">Advanced</div>
                                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Setup + Run Tracking</div>
                                    </Label>
                                </div>
                            </RadioGroup>

                            <DropdownMenuSeparator className="my-2 bg-slate-100 dark:bg-slate-800" />
                            <Button
                                className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/50 dark:hover:bg-purple-800 dark:text-purple-300 border-0 rounded-xl"
                                onClick={() => {
                                    setDropdownOpen(false)
                                    handleGenerateClick()
                                }}
                            >
                                Generate with {mode === 'basic' ? 'Basic' : 'Advanced'} Mode
                            </Button>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Export Excel */}
                <Button
                    onClick={onExportExcel}
                    disabled={!resultsAvailable}
                    title={!resultsAvailable ? 'Export Excel (No results available)' : 'Export Excel'}
                    variant="outline"
                    className="bg-orange-100/90 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/40 dark:hover:bg-orange-800/60 dark:text-orange-300 border-0 rounded-full transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-none"
                >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export Excel
                </Button>

                {/* Chart */}
                <Button
                    onClick={onChart}
                    title="Chart"
                    className="bg-rose-100/90 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:hover:bg-rose-800/60 dark:text-rose-300 rounded-full transition-all duration-300 hover:scale-105 border-0 shadow-none"
                >
                    <PieChart className="w-4 h-4 mr-2" />
                    Chart
                </Button>

                {/* Clear */}
                <Button
                    onClick={onClear}
                    title="Clear"
                    className="bg-slate-100/90 hover:bg-slate-200 text-slate-600 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 rounded-full transition-all duration-300 hover:scale-105 border-0 shadow-none"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Clear
                </Button>
            </div>
        </div>
    )
}
