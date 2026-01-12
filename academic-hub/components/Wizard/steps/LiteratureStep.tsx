import React from 'react';
import { Input } from '../../Common/Input';
import { Button } from '../../Common/Button';
import { Search, Plus } from 'lucide-react';
import { WizardState } from '../Wizard';

interface LiteratureStepProps {
  data: WizardState['literature'];
  onUpdate: (data: Partial<WizardState['literature']>) => void;
}

export const LiteratureStep: React.FC<LiteratureStepProps> = ({ data, onUpdate }) => {
  const addKeyword = () => {
    onUpdate({ keywords: [...data.keywords, ''] });
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...data.keywords];
    newKeywords[index] = value;
    onUpdate({ keywords: newKeywords });
  };

  const removeKeyword = (index: number) => {
    onUpdate({ keywords: data.keywords.filter((_, i) => i !== index) });
  };

  return (
    <div className="ah-wizard-step">
      <div className="ah-wizard-step__field">
        <label className="ah-input-label">Research Keywords</label>
        <div className="ah-keywords-list">
          {data.keywords.map((keyword, index) => (
            <div key={index} className="ah-keyword-item">
              <Input
                placeholder={`Keyword ${index + 1}`}
                value={keyword}
                onChange={(e) => updateKeyword(index, e.target.value)}
              />
              <Button variant="ghost" size="sm" onClick={() => removeKeyword(index)}>
                ×
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={addKeyword} leftIcon={<Plus size={14} />}>
            Add Keyword
          </Button>
        </div>
      </div>
      
      <div className="ah-wizard-step__info">
        <Search size={16} />
        <span>Keywords will be used to search scholarly databases for relevant literature.</span>
      </div>
    </div>
  );
};

export default LiteratureStep;
