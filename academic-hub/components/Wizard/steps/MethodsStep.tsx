import React from 'react';
import { Input, Textarea } from '../../Common/Input';
import { WizardState } from '../Wizard';

interface MethodsStepProps {
  data: WizardState['methodology'];
  onUpdate: (data: Partial<WizardState['methodology']>) => void;
}

export const MethodsStep: React.FC<MethodsStepProps> = ({ data, onUpdate }) => {
  return (
    <div className="ah-wizard-step">
      <div className="ah-wizard-step__field">
        <Textarea
          label="Materials Required"
          placeholder="List the equipment, software, and materials needed..."
          value={data.materials.join(', ')}
          onChange={(e) => onUpdate({ materials: e.target.value.split(',').map(s => s.trim()) })}
          rows={3}
        />
      </div>
      
      <div className="ah-wizard-step__field">
        <Textarea
          label="Research Methods"
          placeholder="Describe your methodology and procedures..."
          value={data.methods}
          onChange={(e) => onUpdate({ methods: e.target.value })}
          rows={5}
        />
      </div>
      
      <div className="ah-wizard-step__row">
        <div className="ah-wizard-step__field">
          <Textarea
            label="Calculations & Costs"
            placeholder="Budget calculations and cost estimates..."
            value={data.costs}
            onChange={(e) => onUpdate({ costs: e.target.value })}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default MethodsStep;
