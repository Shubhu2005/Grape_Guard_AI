import { Beaker, AlertCircle, Droplets, Shield, Star, ThumbsUp, Clock } from 'lucide-react';

const PesticideCard = ({ pesticide, type, recommended }) => {
  const isPlaceholder = pesticide.name === 'No recommendation yet';
  const schedule = pesticide.schedule && pesticide.schedule !== pesticide.dosage ? pesticide.schedule : 'Per label (every 7-14 days)';
  const effectiveness = pesticide.effectiveness || 'High';
  const safety = pesticide.safety || 'Medium risk';
  const description = pesticide.description || pesticide.precautions || 'Follow label instructions carefully.';

  return (
    <div className="pesticide-card animate-fade-in border border-border/50 bg-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Beaker className={`w-5 h-5 ${type === 'organic' ? 'text-organic' : 'text-chemical'}`} />
          <h4 className="text-lg font-bold text-foreground">{pesticide.name}</h4>
          {recommended && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> Best Choice
            </span>
          )}
        </div>
        <span className={type === 'organic' ? 'badge-organic' : 'badge-chemical'}>
          {type === 'organic' ? 'Organic' : 'Chemical'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Dosage</p>
            <p className="text-sm font-semibold text-foreground">{pesticide.dosage}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Schedule</p>
            <p className="text-sm font-semibold text-foreground">{schedule}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-warning" />
          <div>
            <p className="text-xs text-muted-foreground">Effectiveness</p>
            <p className="text-sm font-semibold text-foreground">{effectiveness}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Safety</p>
            <p className="text-sm font-semibold text-foreground">{safety}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{description}</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
          <p className="text-xs font-semibold text-foreground mb-1">Why this recommendation?</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This treatment is recommended based on agricultural guidelines for the detected disease and matched symptoms.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-foreground mb-1">How to apply</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-foreground leading-relaxed">
            <li>Mix with clean water as per dosage.</li>
            <li>Spray both sides of leaves evenly.</li>
            <li>Apply in morning or evening, avoid strong sunlight.</li>
            <li>Repeat as per schedule.</li>
          </ol>
        </div>

        <div>
          <p className="text-xs font-semibold text-foreground mb-1">Safety precautions</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-foreground leading-relaxed">
            <li>Wear gloves and mask.</li>
            <li>Avoid spraying in strong sunlight.</li>
            <li>Keep children and animals away.</li>
            <li>Do not exceed recommended dosage.</li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-foreground mb-1">Preventive measures</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-foreground leading-relaxed">
            <li>Remove infected leaves promptly.</li>
            <li>Improve air circulation and spacing.</li>
            <li>Avoid excess irrigation and waterlogging.</li>
          </ul>
        </div>
      </div>

      {isPlaceholder && (
        <p className="text-sm text-muted-foreground">Awaiting expert validation for specific treatment.</p>
      )}
    </div>
  );
};

export default PesticideCard;
