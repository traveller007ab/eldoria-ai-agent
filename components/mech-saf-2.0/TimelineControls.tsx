import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useMechStore } from '../../stores/useMechStore';
import { MechDynamicSimulationResult } from '../../types';

export const TimelineControls: React.FC = () => {
    const {
        lastSimulationResult,
        playbackTime,
        setPlaybackTime,
        isPlaying,
        setIsPlaying,
        playbackSpeed,
        setPlaybackSpeed
    } = useMechStore();

    const animationRef = useRef<number | undefined>(undefined);
    const lastTimeRef = useRef<number>(0);
    const [isVisible, setIsVisible] = useState(false);

    // Animation Loop
    useEffect(() => {
        if (isPlaying) {
            lastTimeRef.current = Date.now();

            const animate = () => {
                const now = Date.now();
                const delta = (now - lastTimeRef.current) / 1000; // seconds
                lastTimeRef.current = now;

                // Calculate new time
                // speed 1x = 1 sec sim per 1 sec real
                const result = lastSimulationResult as MechDynamicSimulationResult;
                if (!result || !result.isDynamic) return;

                let newTime = playbackTime + delta * playbackSpeed;

                if (newTime >= result.totalDuration) {
                    newTime = result.totalDuration;
                    setIsPlaying(false);
                }

                setPlaybackTime(newTime);

                if (isPlaying && newTime < result.totalDuration) {
                    animationRef.current = requestAnimationFrame(animate);
                }
            };

            animationRef.current = requestAnimationFrame(animate);
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, playbackTime, playbackSpeed, lastSimulationResult]);

    // Derived state
    const dynResult = (lastSimulationResult as any)?.isDynamic ? lastSimulationResult as MechDynamicSimulationResult : null;
    const duration = dynResult?.totalDuration || 60;
    const hasData = !!dynResult;

    // Visibility effect with delay for smooth exit
    useEffect(() => {
        if (hasData) {
            setIsVisible(true);
        } else {
            // Delay hiding allows exit animation to play (if we add onExited logic) or just gives user a moment
            setIsVisible(false);
        }
    }, [hasData]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!hasData) return;
        setPlaybackTime(Number(e.target.value));
    };

    const togglePlay = () => {
        if (!hasData) return;
        setIsPlaying(!isPlaying);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
    };

    const formatTime = (t: number) => {
        const mins = Math.floor(t / 60);
        const secs = Math.floor(t % 60);
        const ms = Math.floor((t % 1) * 10);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    };

    // If never had data and not visible, render nothing
    if (!isVisible && !hasData) return null;

    return (
        <div
            className={`
                absolute bottom-8 left-1/2 -translate-x-1/2 z-50 
                w-[480px] h-[64px]
                bg-slate-900/60 backdrop-blur-md 
                border border-white/10 
                rounded-full 
                shadow-2xl 
                flex items-center px-6 gap-4
                transition-all duration-500 ease-out transform
                ${hasData ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}
            `}
        >
            {/* Play/Pause Main Button */}
            <button
                onClick={togglePlay}
                className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    transition-all duration-200
                    ${isPlaying
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-400'
                        : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 pl-1'
                    }
                `}
            >
                {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4" fill="currentColor" />}
            </button>

            {/* Reset */}
            <button
                onClick={handleReset}
                className="text-slate-400 hover:text-white transition-colors"
                title="Reset Timeline"
            >
                <RotateCcw className="w-4 h-4" />
            </button>

            {/* Timeline Slider & Time */}
            <div className="flex flex-col flex-1 min-w-0 py-1">
                <div className="flex justify-between text-[10px] font-mono font-medium text-slate-400 mb-1 px-1">
                    <span className="text-cyan-400">{formatTime(playbackTime)}</span>
                    <span>{duration.toFixed(1)}s</span>
                </div>

                <div className="relative h-4 flex items-center group">
                    {/* Track Background */}
                    <div className="absolute left-0 right-0 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                        {/* Progress Bar */}
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                            style={{ width: `${(playbackTime / duration) * 100}%` }}
                        />
                    </div>

                    {/* Input Range (Invisible interaction layer) */}
                    <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={playbackTime}
                        onChange={handleSeek}
                        className="
                            absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10
                        "
                    />

                    {/* Thumb (Visual only, follows position) */}
                    <div
                        className="absolute h-3 w-3 bg-white rounded-full shadow-md pointer-events-none transition-transform group-hover:scale-125"
                        style={{ left: `${(playbackTime / duration) * 100}%`, transform: 'translateX(-50%)' }}
                    />
                </div>
            </div>

            {/* Speed Controls */}
            <div className="flex bg-slate-800/50 rounded-full p-0.5 shrink-0 border border-white/5">
                {[1, 5, 10].map(speed => (
                    <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`
                            px-2 py-1 text-[10px] font-bold rounded-full transition-all
                            ${playbackSpeed === speed
                                ? 'bg-slate-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'
                            }
                        `}
                    >
                        {speed}x
                    </button>
                ))}
            </div>
        </div>
    );
};
