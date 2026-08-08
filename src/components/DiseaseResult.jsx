import { AlertTriangle, Info } from 'lucide-react';
const DiseaseResult = ({ result }) => {
    return (<div className="card-elevated animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-warning"/>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-accent mb-2">
            Disease Detected
          </h3>
          <div className="bg-secondary/50 rounded-lg p-4 mb-3">
            <h4 className="text-lg font-bold text-foreground mb-1">
              {result.disease_name}
            </h4>
          </div>
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5"/>
            <p className="text-foreground leading-relaxed">
              {result.description}
            </p>
          </div>
        </div>
      </div>
    </div>);
};
export default DiseaseResult;
