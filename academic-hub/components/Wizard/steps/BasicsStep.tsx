import React from 'react';
import { Input, Textarea } from '../../Common/Input';
import { WizardState } from '../Wizard';

interface BasicsStepProps {
  data: WizardState['basics'];
  onUpdate: (data: Partial<WizardState['basics']>) => void;
}

export const BasicsStep: React.FC<BasicsStepProps> = ({ data, onUpdate }) => {
  return (
    <div className="ah-wizard-step">
      <div className="ah-wizard-step__field">
        <Input
          label="Proposed Thesis Title"
          placeholder="Enter the full title of your research..."
          value={data.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
      </div>
      
      <div className="ah-wizard-step__row">
        <div className="ah-wizard-step__field">
          <Input
            label="Researcher Name"
            placeholder="Your full name"
            value={data.author}
            onChange={(e) => onUpdate({ author: e.target.value })}
          />
        </div>
        
        <div className="ah-wizard-step__field">
          <Input
            label="Registration Number"
            placeholder="e.g., RSU-MECH-2021-0001"
            value={data.regNumber}
            onChange={(e) => onUpdate({ regNumber: e.target.value })}
          />
        </div>
      </div>
      
      <div className="ah-wizard-step__field">
        <Input
          label="Year"
          placeholder="2024"
          value={data.year}
          onChange={(e) => onUpdate({ year: e.target.value })}
        />
      </div>
    </div>
  );
};

export default BasicsStep;
