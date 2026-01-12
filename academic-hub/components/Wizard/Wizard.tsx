import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, X } from 'lucide-react';
import { Button } from '../Common/Button';
import { BasicsStep } from './steps/BasicsStep';
import { ObjectivesStep } from './steps/ObjectivesStep';
import { ScopeStep } from './steps/ScopeStep';
import { LiteratureStep } from './steps/LiteratureStep';
import { MethodsStep } from './steps/MethodsStep';
import { FinishingStep } from './steps/FinishingStep';
import './Wizard.css';

export interface WizardState {
  basics: {
    title: string;
    author: string;
    regNumber: string;
    year: string;
  };
  objectives: {
    aim: string;
    specificObjectives: string[];
  };
  scope: {
    scopeOfWork: string;
    significance: string;
    limitations: string;
  };
  literature: {
    keywords: string[];
    searchQueries: string[];
  };
  methodology: {
    materials: string[];
    methods: string;
    costs: string;
    results_data: string;
  };
  finishing: {
    dedication: string;
    acknowledgements: string;
    preface: string;
  };
}

interface WizardProps {
  initialState?: Partial<WizardState>;
  onSave?: (state: WizardState) => void;
  onClose?: () => void;
}

const STEPS = [
  { id: 'basics', title: 'Project Basics', component: BasicsStep },
  { id: 'objectives', title: 'Aim & Objectives', component: ObjectivesStep },
  { id: 'scope', title: 'Scope & Significance', component: ScopeStep },
  { id: 'literature', title: 'Literature Strategy', component: LiteratureStep },
  { id: 'methodology', title: 'Materials & Methods', component: MethodsStep },
  { id: 'finishing', title: 'Finishing Touches', component: FinishingStep },
] as const;

type StepId = typeof STEPS[number]['id'];

const DEFAULT_STATE: WizardState = {
  basics: { title: '', author: '', regNumber: '', year: new Date().getFullYear().toString() },
  objectives: { aim: '', specificObjectives: [] },
  scope: { scopeOfWork: '', significance: '', limitations: '' },
  literature: { keywords: [], searchQueries: [] },
  methodology: { materials: [], methods: '', costs: '', results_data: '' },
  finishing: { dedication: '', acknowledgements: '', preface: '' },
};

function mergeWizardState(base: WizardState, partial?: Partial<WizardState>): WizardState {
  if (!partial) return base;
  return {
    basics: { ...base.basics, ...partial.basics },
    objectives: { ...base.objectives, ...partial.objectives },
    scope: { ...base.scope, ...partial.scope },
    literature: { ...base.literature, ...partial.literature },
    methodology: { ...base.methodology, ...partial.methodology },
    finishing: { ...base.finishing, ...partial.finishing },
  };
}

export const Wizard: React.FC<WizardProps> = ({ initialState, onSave, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardState>(() => mergeWizardState(DEFAULT_STATE, initialState));
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setIsDirty(true);
  }, [formData]);

  const updateFormData = (section: StepId, data: Record<string, unknown>) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data },
    }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSave = () => {
    onSave?.(formData);
    setIsDirty(false);
  };

  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Do you want to save before closing?');
      if (confirmed) {
        handleSave();
      }
    }
    onClose?.();
  };

  const CurrentStepComponent = STEPS[currentStep].component;
  const stepData = formData[STEPS[currentStep].id as StepId];

  return (
    <div className="ah-wizard-overlay">
      <div className="ah-wizard">
        <header className="ah-wizard__header">
          <div className="ah-wizard__progress">
            <ProgressBar value={((currentStep + 1) / STEPS.length) * 100} />
            <span className="ah-wizard__step-count">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          
          <button className="ah-wizard__close" onClick={handleClose}>
            <X size={20} />
          </button>
        </header>

        <nav className="ah-wizard__nav" aria-label="Wizard steps">
          <StepIndicator 
            steps={STEPS}
            currentIndex={currentStep}
            onStepClick={setCurrentStep}
          />
        </nav>

        <main className="ah-wizard__content">
          <div className="ah-wizard__step-header">
            <h2>{STEPS[currentStep].title}</h2>
            <p>Step {currentStep + 1} of {STEPS.length}</p>
          </div>
          
          <CurrentStepComponent
            data={stepData as never}
            onUpdate={(data) => updateFormData(STEPS[currentStep].id as StepId, data as Record<string, unknown>)}
          />
        </main>

        <footer className="ah-wizard__footer">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            leftIcon={<ChevronLeft size={16} />}
          >
            Previous
          </Button>
          
          <div className="ah-wizard__footer-right">
            {currentStep === STEPS.length - 1 ? (
              <Button variant="primary" onClick={handleSave}>
                Complete Setup
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNext}
                rightIcon={<ChevronRight size={16} />}
              >
                Continue
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="ah-progress-bar">
    <div className="ah-progress-bar__fill" style={{ width: `${value}%` }} />
  </div>
);

interface StepIndicatorProps {
  steps: typeof STEPS;
  currentIndex: number;
  onStepClick: (index: number) => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentIndex, onStepClick }) => {
  const completedSteps = currentIndex;

  return (
    <div className="ah-step-indicator">
      {steps.map((step, index) => {
        const isCompleted = index < completedSteps;
        const isCurrent = index === currentIndex;
        
        return (
          <button
            key={step.id}
            className={`ah-step-indicator__item ${isCurrent ? 'is-current' : ''} ${isCompleted ? 'is-completed' : ''}`}
            onClick={() => index <= completedSteps && onStepClick(index)}
            disabled={index > completedSteps}
          >
            <span className="ah-step-indicator__number">
              {isCompleted ? <CheckCircle2 size={16} /> : index + 1}
            </span>
            <span className="ah-step-indicator__title">{step.title}</span>
            {index < steps.length - 1 && <div className="ah-step-indicator__connector" />}
          </button>
        );
      })}
    </div>
  );
};

export default Wizard;
