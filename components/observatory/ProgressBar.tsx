import React, { useState, useEffect } from 'react';

interface ProgressBarProps {
    isLoading: boolean;
    color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    isLoading,
    color = 'bg-cyan-500'
}) => {
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let interval: any;

        if (isLoading) {
            setVisible(true);
            setProgress(10); // Start at 10%

            // Incrementally slow down as it gets closer to 90%
            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return 90;
                    const diff = Math.max(1, (90 - prev) / 10);
                    return prev + diff;
                });
            }, 300);
        } else {
            setProgress(100);
            const timeout = setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 400); // Wait for zip to 100% to finish
            return () => clearTimeout(timeout);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading]);

    if (!visible && progress === 0) return null;

    return (
        <div className="absolute top-0 left-0 right-0 h-[2px] z-[100] pointer-events-none transition-opacity duration-300" style={{ opacity: visible ? 1 : 0 }}>
            <div
                className={`h-full ${color} transition-all duration-300 ease-out shadow-[0_0_8px_rgba(34,211,238,0.5)]`}
                style={{ width: `${progress}%` }}
            />
        </div>
    );
};
