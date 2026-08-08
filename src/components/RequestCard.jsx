import StatusBadge from './StatusBadge';
import ReasoningBlock from './ReasoningBlock';
import { Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
const RequestCard = ({ request, showFarmerInfo = false, onClick }) => {
    return (<div className={`card-elevated p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <div className="flex items-start gap-4">
        {/* Image Preview */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
          <img src={request.image_url} alt="Leaf sample" className="w-full h-full object-cover"/>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h4 className="font-semibold text-foreground truncate">
                {request.disease_name}
              </h4>
              {showFarmerInfo && (<p className="text-sm text-muted-foreground">
                  {request.farmer_name} • ID: {request.farmer_id}
                </p>)}
            </div>
            <StatusBadge status={request.status} size="sm"/>
          </div>

          {request.description && (
            <div className="mb-2">
              <ReasoningBlock text={request.description} title="Reasoning (summary)"/>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3"/>
              {format(new Date(request.created_at), 'MMM d, yyyy')}
            </span>
            {request.symptoms_by_farmer && (<span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3"/>
                Symptoms noted
              </span>)}
          </div>
        </div>
      </div>
    </div>);
};
export default RequestCard;
