import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, SkipForward } from 'lucide-react';
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

    const animationRef = useRef<number>();
    const lastTimeRef = useRef<number>(0);

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

    if (!lastSimulationResult || !(lastSimulationResult as any).isDynamic) return null;
    const dynResult = lastSimulationResult as MechDynamicSimulationResult;

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlaybackTime(Number(e.target.value));
    };

    const togglePlay = () => setIsPlaying(!isPlaying);

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

    return (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-[500px] bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
                {/* Controls */}
                <button
                    onClick={handleReset}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                    title="Reset"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>

                <button
                    onClick={togglePlay}
                    className="p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="flex bg-slate-700 rounded p-0.5">
                    {[1, 5, 10].map(speed => (
                        <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${playbackSpeed === speed
                                    ? 'bg-slate-600 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {speed}x
                        </button>
                    ))}
                </div>

                <div className="font-mono text-sm text-cyan-400 min-w-[60px] text-right">
                    {formatTime(playbackTime)}
                </div>
            </div>

            {/* Slider */}
            <input
                type="range"
                min={0}
                max={dynResult.totalDuration}
                step={0.1}
                value={playbackTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
            />
            <div className="flex justify-between mt-1 text-[10px] text-slate-500 font-mono">
                <span>0.0s</span>
                <span>{dynResult.totalDuration.toFixed(1)}s</span>
            </div>
        </div>
    );
};
