import React from 'react';
import { Input, Textarea } from '../../Common/Input';
import { Button } from '../../Common/Button';
import { Trash2, Plus } from 'lucide-react';
import { WizardState } from '../Wizard';

interface ObjectivesStepProps {
  data: WizardState['objectives'];
  onUpdate: (data: Partial<WizardState['objectives']>) => void;
}

export const ObjectivesStep: React.FC<ObjectivesStepProps> = ({ data, onUpdate }) => {
  const addObjective = () => {
    onUpdate({
      specificObjectives: [...data.specificObjectives, ''],
    });
  };

  const removeObjective = (index: number) => {
    onUpdate({
      specificObjectives: data.specificObjectives.filter((_, i) => i !== index),
    });
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...data.specificObjectives];
    newObjectives[index] = value;
    onUpdate({ specificObjectives: newObjectives });
  };

  return (
    <div className="ah-wizard-step">
      <div className="ah-wizard-step__field">
        <Textarea
          label="Primary Aim"
          placeholder="The main goal of this research is to..."
          value={data.aim}
          onChange={(e) => onUpdate({ aim: e.target.value })}
          rows={4}
        />
      </div>
      
      <div className="ah-wizard-step__field">
        <label className="ah-input-label">Specific Objectives (SMART)</label>
        <div className="ah-objectives-list">
          {data.specificObjectives.map((objective, index) => (
            <div key={index} className="ah-objective-item">
              <Input
                placeholder={`Objective ${index + 1}`}
                value={objective}
                onChange={(e) => updateObjective(index, e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeObjective(index)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={addObjective}
            leftIcon={<Plus size={14} />}
          >
            Add Objective
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ObjectivesStep;
