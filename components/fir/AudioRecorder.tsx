import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square } from './Icons';

interface AudioRecorderProps {
  onSave: (file: File) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSave }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
        onSave(file);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please allow permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-full transition-colors ${isRecording ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-gray-100 dark:bg-gray-700 border border-transparent'}`}>
      {isRecording ? (
        <>
          <span className="text-red-600 dark:text-red-400 animate-pulse text-xs font-bold px-2">REC {formatTime(duration)}</span>
          <button
            onClick={stopRecording}
            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
            type="button"
          >
            <Square size={16} />
          </button>
          {/* Visual waveform simulation */}
          <div className="flex gap-0.5 h-4 items-center">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1 bg-red-400 animate-bounce" style={{ height: `${Math.random() * 100}%`, animationDuration: '0.5s' }} />
            ))}
          </div>
        </>
      ) : (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
          type="button"
        >
          <Mic size={18} />
          <span className="text-sm font-medium">Record Audio</span>
        </button>
      )}
    </div>
  );
};