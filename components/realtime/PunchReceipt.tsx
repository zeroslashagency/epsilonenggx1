
import { CheckCircle2, Clock, LogOut } from "lucide-react"

interface PunchReceiptProps {
    employeeName: string
    employeeCode: string
    time: string
    type: 'in' | 'out'
    onAnimationEnd?: () => void
}

export function PunchReceipt({ employeeName, employeeCode, time, type, onAnimationEnd }: PunchReceiptProps) {
    const isCheckIn = type === 'in'

    return (
        <div
            className="relative w-72 bg-white text-black shadow-xl animate-in slide-in-from-top-10 fade-in duration-500 mb-4 transform transition-all"
            onAnimationEnd={onAnimationEnd}
            style={{
                filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))'
            }}
        >
            {/* Paper Texture/Color */}
            <div className="p-6 relative z-10 bg-white">

                {/* Header */}
                <div className="flex flex-col items-center justify-center mb-6 border-b-2 border-dashed border-gray-200 pb-4">
                    {isCheckIn ? (
                        <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
                    ) : (
                        <LogOut className="h-8 w-8 text-orange-600 mb-2" />
                    )}
                    <h3 className="font-bold text-lg uppercase tracking-wider">
                        {isCheckIn ? 'Check In' : 'Check Out'}
                    </h3>
                    <span className="text-xs text-gray-400 font-mono">SUCCESSFUL</span>
                </div>

                {/* Body */}
                <div className="text-center space-y-1 mb-6">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">
                        {employeeName}
                    </h2>
                    <p className="text-sm font-bold text-gray-500 font-mono">
                        ID: {employeeCode}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs font-mono text-gray-400 bg-gray-50 p-2 rounded">
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{time}</span>
                    </div>
                    <span>#REC-{Math.floor(Math.random() * 9999)}</span>
                </div>

                {/* Barcode (Fake) */}
                <div className="mt-4 h-8 w-full flex justify-center items-end gap-[2px] opacity-70">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="bg-black h-full"
                            style={{
                                width: Math.random() > 0.5 ? '2px' : '4px',
                                height: Math.random() > 0.8 ? '80%' : '100%'
                            }}
                        />
                    ))}
                </div>

            </div>

            {/* Jagged Bottom Edge */}
            <div
                className="absolute -bottom-3 left-0 w-full h-4 bg-white"
                style={{
                    maskImage: 'radial-gradient(circle at 10px 0, transparent 0, transparent 10px, black 11px)',
                    maskSize: '20px 20px',
                    maskRepeat: 'repeat-x',
                    WebkitMaskImage: 'radial-gradient(circle at 10px 0, transparent 0, transparent 10px, black 11px)',
                    WebkitMaskSize: '20px 20px',
                    WebkitMaskRepeat: 'repeat-x',
                    transform: 'rotate(180deg)' // If needed to flip the cuts
                }}
            />
            {/* Alternative simple CSS sawtooth if mask is tricky in some browsers */}
            <div
                className="absolute top-full left-0 w-full overflow-hidden leading-none text-white h-4"
                style={{ transform: 'rotate(180deg)' }}
            >
                <svg className="block w-full h-full" data-name="layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M1200 120L0 16.48 0 0 1200 0 1200 120z" className="shape-fill" fill="#ffffff" fillOpacity="0"></path>
                    {/* Simple sawtooth SVG path */}
                </svg>
            </div>

            {/* Better Sawtooth via CSS radial gradient directly on the main div? 
          Actually the mask approach above creates "holes", we want "teeth".
          Let's use a simpler "Repeated Circle Gradient" applied to a pseudo-element or separate div.
      */}
            <div
                className="h-4 w-full bg-transparent absolute -bottom-4 left-0"
                style={{
                    background: "radial-gradient(circle, transparent 50%, #ffffff 50%)",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 -10px"
                    // This creates circles. We want teeth. 
                    // Let's stick to a simpler method: Conic Gradient or just the mask.
                    // "radial-gradient(10px circle at bottom, transparent 50%, white 50%)"
                }}
            ></div>

            <div
                className="absolute left-0 right-0 h-4 bg-transparent"
                style={{
                    bottom: '-16px', // Push it down
                    background: 'radial-gradient(circle, transparent, transparent 50%, white 50%, white)',
                    backgroundSize: '20px 20px', // Size of teeth
                    backgroundColor: 'transparent'
                    // This is hard to get right blindly.
                }}
            />

            {/* Proven CSS Sawtooth: */}
            <div
                className="absolute top-full left-0 w-full h-4 bg-repeat-x"
                style={{
                    background: "linear-gradient(45deg, transparent 33.333%, #ffffff 33.333%, #ffffff 66.667%, transparent 66.667%), linear-gradient(-45deg, transparent 33.333%, #ffffff 33.333%, #ffffff 66.667%, transparent 66.667%)",
                    backgroundSize: "20px 40px",
                    backgroundPosition: "0 -20px"
                }}
            />

        </div>
    )
}
