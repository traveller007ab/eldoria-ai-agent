import React from 'react';
import { Textarea } from '../../Common/Input';
import { WizardState } from '../Wizard';

interface FinishingStepProps {
  data: WizardState['finishing'];
  onUpdate: (data: Partial<WizardState['finishing']>) => void;
}

export const FinishingStep: React.FC<FinishingStepProps> = ({ data, onUpdate }) => {
  return (
    <div className="ah-wizard-step">
      <div className="ah-wizard-step__field">
        <Textarea
          label="Dedication (Optional)"
          placeholder="To someone special..."
          value={data.dedication}
          onChange={(e) => onUpdate({ dedication: e.target.value })}
          rows={2}
        />
      </div>
      
      <div className="ah-wizard-step__field">
        <Textarea
          label="Acknowledgements"
          placeholder="Thank those who helped with your research..."
          value={data.acknowledgements}
          onChange={(e) => onUpdate({ acknowledgements: e.target.value })}
          rows={4}
        />
      </div>
      
      <div className="ah-wizard-step__field">
        <Textarea
          label="Preface (Optional)"
          placeholder="Personal note about why you chose this topic..."
          value={data.preface}
          onChange={(e) => onUpdate({ preface: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
};

export default FinishingStep;
