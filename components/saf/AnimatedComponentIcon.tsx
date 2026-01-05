import React from 'react';
import {
    Zap, Cog, Database, CircleDot, Flame, Droplets,
    Wind, Lightbulb, Fan, Gauge, ThermometerSun,
    Activity, ArrowDownUp
} from 'lucide-react';

/**
 * AnimatedComponentIcon: Smart animated icons that respond to component state
 * Shows visual feedback based on output value (spinning fan, pulsing power, etc.)
 */

interface AnimatedComponentIconProps {
    componentId: string;
    componentName: string;
    category: 'source' | 'transform' | 'store' | 'sink';
    outputValue?: number;
    isActive?: boolean;
    size?: number;
}

// Map component names to specific icon behaviors
const getIconForComponent = (name: string, category: string) => {
    const lower = name.toLowerCase();

    // Sources
    if (lower.includes('battery') || lower.includes('power')) return { icon: Zap, animation: 'pulse' };
    if (lower.includes('solar')) return { icon: CircleDot, animation: 'pulse' };
    if (lower.includes('fuel') || lower.includes('combustion')) return { icon: Flame, animation: 'flicker' };
    if (lower.includes('pump')) return { icon: Droplets, animation: 'bounce' };

    // Transforms
    if (lower.includes('fan') || lower.includes('blower')) return { icon: Fan, animation: 'spin' };
    if (lower.includes('motor')) return { icon: Cog, animation: 'spin' };
    if (lower.includes('inverter')) return { icon: ArrowDownUp, animation: 'pulse' };
    if (lower.includes('heat') || lower.includes('thermal')) return { icon: ThermometerSun, animation: 'pulse' };
    if (lower.includes('exchanger')) return { icon: Wind, animation: 'wave' };
    if (lower.includes('compressor')) return { icon: Gauge, animation: 'bounce' };

    // Storage
    if (lower.includes('tank') || lower.includes('reservoir')) return { icon: Droplets, animation: 'fill' };
    if (lower.includes('accumulator') || lower.includes('capacitor')) return { icon: Database, animation: 'pulse' };

    // Sinks
    if (lower.includes('load') || lower.includes('light')) return { icon: Lightbulb, animation: 'glow' };
    if (lower.includes('drain')) return { icon: CircleDot, animation: 'none' };

    // Defaults by category
    const defaults: Record<string, { icon: React.ComponentType<any>; animation: string }> = {
        source: { icon: Zap, animation: 'pulse' },
        transform: { icon: Cog, animation: 'spin' },
        store: { icon: Database, animation: 'pulse' },
        sink: { icon: Activity, animation: 'pulse' },
    };

    return defaults[category] || { icon: CircleDot, animation: 'none' };
};

// Animation CSS classes
const getAnimationClass = (animation: string, isActive: boolean, intensity: number): string => {
    if (!isActive) return '';

    // Scale animation speed by intensity (0-1)
    const speedClass = intensity > 0.7 ? 'fast' : intensity > 0.3 ? 'medium' : 'slow';

    switch (animation) {
        case 'spin':
            return `animate-spin-${speedClass}`;
        case 'pulse':
            return `animate-pulse`;
        case 'bounce':
            return `animate-bounce`;
        case 'flicker':
            return `animate-flicker`;
        case 'glow':
            return `animate-glow`;
        case 'wave':
            return `animate-wave`;
        case 'fill':
            return `animate-pulse`;
        default:
            return '';
    }
};

export const AnimatedComponentIcon: React.FC<AnimatedComponentIconProps> = ({
    componentId,
    componentName,
    category,
    outputValue = 0,
    isActive = false,
    size = 20,
}) => {
    const { icon: IconComponent, animation } = getIconForComponent(componentName, category);
    const intensity = Math.min(1, outputValue / 100);
    const animationClass = getAnimationClass(animation, isActive, intensity);

    // Color based on activity
    const colorClass = isActive
        ? 'text-emerald-400'
        : 'text-gray-500';

    // Glow effect when active
    const glowStyle = isActive ? {
        filter: `drop-shadow(0 0 ${4 + intensity * 8}px currentColor)`,
    } : {};

    return (
        <div
            className={`relative flex items-center justify-center ${animationClass} transition-all duration-300`}
            style={glowStyle}
        >
            <IconComponent
                className={`${colorClass} transition-colors duration-300`}
                size={size}
            />

            {/* Activity indicator dot */}
            {isActive && (
                <span
                    className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"
                    style={{ animationDuration: `${1 + (1 - intensity)}s` }}
                />
            )}
        </div>
    );
};

// CSS to inject (add to your global styles or a <style> tag)
export const AnimationStyles = `
@keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
@keyframes spin-medium {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
@keyframes spin-fast {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
@keyframes flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
    75% { opacity: 0.8; }
}
@keyframes glow {
    0%, 100% { filter: drop-shadow(0 0 8px currentColor); }
    50% { filter: drop-shadow(0 0 16px currentColor); }
}
@keyframes wave {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(3px); }
}

.animate-spin-slow { animation: spin-slow 3s linear infinite; }
.animate-spin-medium { animation: spin-medium 1.5s linear infinite; }
.animate-spin-fast { animation: spin-fast 0.5s linear infinite; }
.animate-flicker { animation: flicker 0.3s ease-in-out infinite; }
.animate-glow { animation: glow 1.5s ease-in-out infinite; }
.animate-wave { animation: wave 1s ease-in-out infinite; }
`;

export default AnimatedComponentIcon;
