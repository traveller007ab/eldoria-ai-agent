import React from 'react';
import { Textarea } from '../../Common/Input';
import { WizardState } from '../Wizard';

interface ScopeStepProps {
  data: WizardState['scope'];
  onUpdate: (data: Partial<WizardState['scope']>) => void;
}

export const ScopeStep: React.FC<ScopeStepProps> = ({ data, onUpdate }) => {
  return (
    <div className="ah-wizard-step">
      <div className="ah-wizard-step__field">
        <Textarea
          label="Scope of Work"
          placeholder="Define what your research will and won't cover..."
          value={data.scopeOfWork}
          onChange={(e) => onUpdate({ scopeOfWork: e.target.value })}
          rows={4}
        />
      </div>
      
      <div className="ah-wizard-step__field">
        <Textarea
          label="Significance"
          placeholder="Why is this research important? What gap does it fill?"
          value={data.significance}
          onChange={(e) => onUpdate({ significance: e.target.value })}
          rows={4}
        />
      </div>
      
      <div className="ah-wizard-step__field">
        <Textarea
          label="Limitations"
          placeholder="What are the constraints or limitations of your study?"
          value={data.limitations}
          onChange={(e) => onUpdate({ limitations: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
};

export default ScopeStep;
