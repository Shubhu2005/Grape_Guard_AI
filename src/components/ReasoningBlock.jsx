import React from 'react';
import { Info, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';

const deriveConfidence = (text) => {
  const source = String(text || '');
  const decimalMatch = source.match(/\bconfidence(?:\s+(?:of|is|level is|level:)|\s*[:=])?\s*(0?\.\d+|1(?:\.0+)?)\b/i);
  const percentMatch = source.match(/\bconfidence(?:\s+(?:of|is|level is|level:)|\s*[:=])?\s*(\d{1,3})\s?%/i);
  const value = decimalMatch
    ? Math.round(Number(decimalMatch[1]) * 100)
    : percentMatch
      ? Number(percentMatch[1])
      : 72;
  const normalizedValue = Math.min(100, Math.max(0, value));
  if (normalizedValue >= 80) return { value: normalizedValue, label: 'High', color: 'bg-success/20 text-success', bar: 'bg-success' };
  if (normalizedValue >= 60) return { value: normalizedValue, label: 'Medium', color: 'bg-warning/20 text-warning', bar: 'bg-warning' };
  return { value: normalizedValue, label: 'Low', color: 'bg-destructive/20 text-destructive', bar: 'bg-destructive' };
};

const ReasoningBlock = ({ text, title = 'Detection Reasoning', severity = 'Moderate', symptoms = [] }) => {
  const confidence = deriveConfidence(text);
  const cleanSymptoms = Array.isArray(symptoms) ? symptoms.filter(Boolean) : [];

  return (
    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-muted-foreground" />
        <h5 className="font-medium text-foreground">{title}</h5>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-card border border-border/50">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Confidence
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`${confidence.bar} h-2 rounded-full transition-all`}
                style={{ width: `${confidence.value}%` }}
              />
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${confidence.color}`}>
              {confidence.value}% {confidence.label}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-card border border-border/50">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Severity
          </p>
          <span className="text-sm font-semibold text-foreground">{severity}</span>
        </div>

        <div className="p-3 rounded-lg bg-card border border-border/50">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Impact on Crop
          </p>
          <span className="text-sm text-foreground">
            {String(text || '').slice(0, 90) || 'Potential yield loss if untreated.'}
          </span>
        </div>
      </div>

      {cleanSymptoms.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Detected Symptoms</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
            {cleanSymptoms.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground mb-1">AI Reasoning</p>
        <p className="text-sm text-foreground leading-relaxed">
          {text || 'The model matched visual patterns to the detected disease and generated this recommendation.'}
        </p>
      </div>
    </div>
  );
};

export default ReasoningBlock;
