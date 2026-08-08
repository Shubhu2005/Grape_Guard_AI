import { useMemo, useState } from 'react';
import { Leaf, FlaskConical, Activity } from 'lucide-react';
import PesticideCard from './PesticideCard';

/**
 * Renders pesticide recommendations with local selection feedback.
 * Farmers get a working button (even if backend is read-only), and experts
 * see the same confirmation when they pick an option in view mode.
 */
const PesticideSection = ({ pesticides }) => {
  const [activeTab, setActiveTab] = useState('organic');
  const sections = useMemo(
    () => ({
      organic: pesticides?.organic || [],
      chemical: pesticides?.chemical || [],
    }),
    [pesticides]
  );

  const renderCards = (type) =>
    sections[type].map((p, index) => {
      return (
        <PesticideCard
          key={`${type}-${index}-${p.name}`}
          pesticide={p}
          type={type}
          recommended={index === 0}
        />
      );
    });

  const confidence = Number(pesticides?.confidence || pesticides?.meta?.confidence || 72);
  const severity = pesticides?.severity || pesticides?.meta?.severity || 'Moderate';
  const confColor =
    confidence >= 80 ? 'bg-success' : confidence >= 60 ? 'bg-warning' : 'bg-destructive';

  return (
    <div className="card-elevated animate-fade-in">
      <h3 className="text-xl font-semibold text-accent mb-4">Recommended Pesticides</h3>

      {/* Confidence & Severity */}
      <div className="mb-5 p-4 rounded-xl bg-card border border-border/50 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">AI Confidence</p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {confidence}% 
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`${confColor} h-2`} style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Severity:</span>
          <span className="px-2 py-1 rounded-full bg-muted text-foreground">{severity}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-6 p-1 bg-muted/50 rounded-lg">
        <button
          onClick={() => setActiveTab('organic')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
            activeTab === 'organic'
              ? 'bg-organic text-organic-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Leaf className="w-5 h-5" />
          <span>Organic</span>
          <span className="ml-1 text-xs opacity-80">({sections.organic.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('chemical')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
            activeTab === 'chemical'
              ? 'bg-chemical text-chemical-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FlaskConical className="w-5 h-5" />
          <span>Chemical</span>
          <span className="ml-1 text-xs opacity-80">({sections.chemical.length})</span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {activeTab === 'organic' ? renderCards('organic') : renderCards('chemical')}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Tip: Organic options are safer for the environment. Consult an expert for severe cases.
      </p>
    </div>
  );
};

export default PesticideSection;
