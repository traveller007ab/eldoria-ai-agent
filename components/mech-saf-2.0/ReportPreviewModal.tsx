import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { MechBlueprint, MechSimulationResult } from '../../types';
import { ReportTemplate } from './ReportTemplate';

interface ReportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    blueprint: MechBlueprint;
    result: MechSimulationResult;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({ isOpen, onClose, blueprint, result }) => {
    const printContentRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-sm animate-fade-in print:bg-white print:static print:h-auto print:block">
            {/* Toolbar (Hidden when printing) */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shrink-0 print:hidden">
                <h2 className="text-xl font-bold text-white">Report Preview</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium transition-colors shadow-lg"
                    >
                        <Printer className="w-5 h-5" />
                        Print / Save PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Scrollable Preview Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar print:overflow-visible print:p-0">
                <div className="max-w-[210mm] mx-auto shadow-2xl print:shadow-none print:m-0 print:w-full">
                    <ReportTemplate blueprint={blueprint} result={result} />
                </div>
            </div>
        </div>
    );
};
