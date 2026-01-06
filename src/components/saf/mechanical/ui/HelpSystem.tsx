/**
 * Tooltip and Help System
 * Comprehensive contextual help and tooltips for the Mechanical SAF Lab
 */

import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { HelpCircle, X, ChevronLeft, ChevronRight, Info, Lightbulb } from 'lucide-react';

export interface HelpTopic {
  id: string;
  title: string;
  content: string;
  category: 'getting-started' | 'components' | 'simulation' | 'analysis' | 'export';
  relatedTopics?: string[];
}

export interface TooltipConfig {
  title: string;
  description: string;
  shortcut?: string;
  category?: string;
}

const HelpTopics: HelpTopic[] = [
  {
    id: 'getting-started-overview',
    title: 'Getting Started',
    category: 'getting-started',
    content: `Welcome to the Mechanical SAF Lab! This tool helps you design and simulate mechanical engineering systems.

**Basic Workflow:**
1. Drag components from the palette to the canvas
2. Connect components using their ports
3. Configure parameters in the Properties panel
4. Run simulations to analyze performance
5. Export results or save your blueprint

**Keyboard Shortcuts:**
- Ctrl+C/V: Copy/Paste components
- Ctrl+Z/Y: Undo/Redo
- Ctrl+S: Save blueprint
- Delete: Remove selected component
- Arrow keys: Move components
- Escape: Deselect`
  },
  {
    id: 'components-overview',
    title: 'Understanding Components',
    category: 'components',
    content: `Components represent physical devices in your system. Each component has:

**Ports:** Connection points for linking components together
- **Input ports** (left side): Receive fluid, energy, or signals
- **Output ports** (right side): Send fluid, energy, or signals

**Parameters:** Design variables you can configure
- Flow rates, pressures, dimensions, material properties
- Click on a component to see its parameters
- Parameters with red borders have validation errors

**States:** Calculated values from simulation
- Pressure, temperature, flow rates, power
- Visible after running a simulation`
  },
  {
    id: 'simulation-basics',
    title: 'Running Simulations',
    category: 'simulation',
    content: `Simulations analyze your system using physical models.

**Types of Simulations:**
- **Fluid Flow:** Newton-Raphson solver for pipe networks
- **Thermodynamic:** Heat transfer and cycle analysis
- **Performance:** Component efficiency and power consumption

**Simulation Results:**
- Component states show calculated values
- Performance curves visualize pump/turbine behavior
- KPI dashboard shows system-level metrics
- Check logs for convergence status

**Tips:**
- Run simulations after making parameter changes
- Invalid parameters may cause convergence failures
- Large systems may take longer to solve`
  },
  {
    id: 'export-blueprints',
    title: 'Exporting Your Work',
    category: 'export',
    content: `Export your designs in multiple formats:

**JSON (Complete Blueprint):**
- Full system configuration
- All components and connections
- Parameter values
- Import back into the lab

**CSV (Bill of Materials):**
- Component list with parameters
- Compatible with Excel/Google Sheets
- Useful for procurement and documentation

**Tips:**
- Use JSON for backup and sharing
- Use CSV for reports and BOMs
- Include system diagrams in PDF reports`
  },
  {
    id: 'pump-performance',
    title: 'Pump Performance Curves',
    category: 'analysis',
    content: `Performance curves show how pumps operate:

**Head-Flow Curve:**
- Shows pressure head at different flow rates
- Use to select operating point
- Head decreases as flow increases

**Efficiency Curve:**
- Shows energy efficiency
- Peak at Best Efficiency Point (BEP)
- Operate near BEP for optimal performance

**Power Curve:**
- Shows power consumption
- Power increases with flow rate
- Important for motor sizing

**System Curve:**
- Your piping system creates resistance
- Operating point = pump curve × system curve intersection`
  }
];

interface HelpContextType {
  openHelp: (topicId: string) => void;
  closeHelp: () => void;
  currentTopic: HelpTopic | null;
  showTooltip: (content: TooltipConfig) => void;
  hideTooltip: () => void;
  tooltipContent: TooltipConfig | null;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const HelpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTopic, setCurrentTopic] = useState<HelpTopic | null>(null);
  const [tooltipContent, setTooltipContent] = useState<TooltipConfig | null>(null);
  
  const openHelp = useCallback((topicId: string) => {
    const topic = HelpTopics.find(t => t.id === topicId);
    setCurrentTopic(topic || null);
  }, []);
  
  const closeHelp = useCallback(() => {
    setCurrentTopic(null);
  }, []);
  
  const showTooltip = useCallback((content: TooltipConfig) => {
    setTooltipContent(content);
  }, []);
  
  const hideTooltip = useCallback(() => {
    setTooltipContent(null);
  }, []);
  
  return (
    <HelpContext.Provider value={{ openHelp, closeHelp, currentTopic, showTooltip, hideTooltip, tooltipContent }}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within HelpProvider');
  }
  return context;
};

/**
 * Help Button Component
 */
export const HelpButton: React.FC<{ topicId: string; className?: string }> = ({ topicId, className = '' }) => {
  const { openHelp } = useHelp();
  
  return (
    <button
      onClick={() => openHelp(topicId)}
      className={`text-gray-400 hover:text-cyan-400 transition-colors ${className}`}
      aria-label="Show help"
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );
};

/**
 * Tooltip Wrapper Component
 */
export const Tooltip: React.FC<{
  children: React.ReactNode;
  content: TooltipConfig;
  delay?: number;
}> = ({ children, content, delay = 500 }) => {
  const { showTooltip, hideTooltip } = useHelp();
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      showTooltip(content);
    }, delay);
    setTimeoutId(id);
  };
  
  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    hideTooltip();
  };
  
  return (
    <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
    </span>
  );
};

/**
 * Global Help Panel
 */
export const HelpPanel: React.FC = () => {
  const { currentTopic, closeHelp } = useHelp();
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  
  if (!currentTopic) return null;
  
  const categoryTopics = HelpTopics.filter(t => t.category === currentTopic.category);
  const currentIndex = categoryTopics.findIndex(t => t.id === currentTopic.id);
  
  const navigateTopic = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < categoryTopics.length) {
      setCurrentTopicIndex(newIndex);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">{currentTopic.title}</h2>
          </div>
          <button onClick={closeHelp} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-invert max-w-none">
            {currentTopic.content.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('**')) {
                const title = paragraph.replace(/\*\*/g, '').replace(':', '');
                return (
                  <h3 key={idx} className="text-cyan-400 font-semibold text-lg mt-6 mb-3">
                    {title}
                  </h3>
                );
              }
              if (paragraph.startsWith('- ')) {
                return (
                  <li key={idx} className="text-gray-300 ml-4 list-disc">
                    {paragraph.replace('- ', '')}
                  </li>
                );
              }
              if (paragraph.includes('**')) {
                const parts = paragraph.split('**');
                return (
                  <p key={idx} className="text-gray-300 mb-3">
                    {parts.map((part, i) => 
                      i % 2 === 1 ? <strong key={i} className="text-cyan-300">{part}</strong> : part
                    )}
                  </p>
                );
              }
              return (
                <p key={idx} className="text-gray-300 mb-3">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex gap-2">
            {categoryTopics.length > 1 && (
              <>
                <button
                  onClick={() => navigateTopic('prev')}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => navigateTopic('next')}
                  disabled={currentIndex === categoryTopics.length - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {currentIndex + 1} of {categoryTopics.length} in {currentTopic.category}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Global Tooltip Component
 */
export const GlobalTooltip: React.FC = () => {
  const { tooltipContent } = useHelp();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX + 10, y: e.clientY + 10 });
    };
    
    if (tooltipContent) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [tooltipContent]);
  
  if (!tooltipContent) return null;
  
  return (
    <div
      className="fixed z-50 max-w-sm pointer-events-none"
      style={{ left: position.x, top: position.y }}
    >
      <div className="bg-gray-900 border border-gray-600 rounded-lg shadow-xl p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white mb-1">
              {tooltipContent.title}
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              {tooltipContent.description}
            </p>
            {tooltipContent.shortcut && (
              <div className="mt-2 text-xs">
                <span className="text-gray-500">Shortcut:</span>{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-cyan-400 font-mono text-xs">
                  {tooltipContent.shortcut}
                </kbd>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Quick Tips Carousel
 */
export const QuickTips: React.FC = () => {
  const tips = [
    'Use Ctrl+C/V to copy and paste components',
    'Arrow keys move selected components (Shift for 10x speed)',
    'Click on ports to see connection compatibility',
    'Parameters with red borders have validation errors',
    'Use templates to start with pre-built systems'
  ];
  
  const [currentTip, setCurrentTip] = useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg px-4 py-3 max-w-sm">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-300">{tips[currentTip]}</p>
      </div>
    </div>
  );
};
