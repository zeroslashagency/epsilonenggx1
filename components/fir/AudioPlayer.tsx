import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from './Icons';

interface AudioPlayerProps {
    src: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            setProgress((audio.currentTime / audio.duration) * 100);
        };

        const setAudioDuration = () => {
            setDuration(audio.duration);
        };

        const onEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', setAudioDuration);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', setAudioDuration);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newProgress = parseFloat(e.target.value);
        if (audioRef.current) {
            const newTime = (newProgress / 100) * audioRef.current.duration;
            audioRef.current.currentTime = newTime;
            setProgress(newProgress);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 p-3 flex items-center gap-3 w-full max-w-md transition-all hover:shadow-md">
            <audio ref={audioRef} src={src} preload="metadata" />

            <button
                onClick={togglePlay}
                className={`w-10 h-10 flex items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 shrink-0
          ${isPlaying ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700'}`}
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                {/* Waveform Visualization (Simulated) */}
                <div className="flex items-center gap-0.5 h-6 mb-1 opacity-80">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-1 rounded-full transition-all duration-300 ${isPlaying ? 'bg-indigo-400 dark:bg-indigo-400 animate-pulse' : 'bg-slate-200 dark:bg-gray-600'}`}
                            style={{
                                height: isPlaying ? `${Math.max(20, Math.random() * 100)}%` : '30%',
                                animationDelay: `${i * 0.05}s`
                            }}
                        />
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400 w-8 text-right">{formatTime(audioRef.current?.currentTime || 0)}</span>

                    <div className="relative flex-1 h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden group">
                        <div
                            className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-100"
                            style={{ width: `${progress}%` }}
                        />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>

                    <span className="text-[10px] font-medium text-slate-400 dark:text-gray-500 w-8">{formatTime(duration)}</span>
                </div>
            </div>

            <button onClick={toggleMute} className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-gray-700 transition">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
        </div>
    );
};
