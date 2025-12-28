import React from 'react';
import { ChevronRight, Home, Layers } from 'lucide-react';

/**
 * Breadcrumb Trail for navigating hierarchical components
 * Allows drilling down into nested components and back up
 */

interface BreadcrumbItem {
    id: string;
    name: string;
    type: 'core' | 'subcore' | 'micro';
}

interface SAFBreadcrumbsProps {
    trail: BreadcrumbItem[];
    onNavigate: (index: number) => void;
}

export const SAFBreadcrumbs: React.FC<SAFBreadcrumbsProps> = ({
    trail,
    onNavigate,
}) => {
    if (trail.length === 0) return null;

    return (
        <div className="flex items-center gap-1 px-4 py-2 bg-black/20 border-b border-cyan-900/20 text-xs overflow-x-auto">
            {/* Home / Root */}
            <button
                onClick={() => onNavigate(-1)}
                className="shrink-0 p-1 text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                title="Back to root"
            >
                <Home className="w-3 h-3" />
            </button>

            {trail.map((item, index) => (
                <React.Fragment key={item.id}>
                    <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />
                    <button
                        onClick={() => onNavigate(index)}
                        className={`shrink-0 px-2 py-1 rounded transition-colors flex items-center gap-1 ${index === trail.length - 1
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Layers className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{item.name}</span>
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
};

export default SAFBreadcrumbs;
