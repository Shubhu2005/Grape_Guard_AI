import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
const StatusBadge = ({ status, size = 'md' }) => {
    const config = {
        waiting: {
            label: 'Waiting for Expert',
            icon: Clock,
            className: 'bg-warning/10 text-warning border-warning/20',
        },
        approved: {
            label: 'Approved',
            icon: CheckCircle,
            className: 'bg-success/10 text-success border-success/20',
        },
        rejected: {
            label: 'Rejected',
            icon: XCircle,
            className: 'bg-destructive/10 text-destructive border-destructive/20',
        },
    };
    const { label, icon: Icon, className } = config[status];
    const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
    return (<Badge variant="outline" className={`${className} ${sizeClasses} font-medium gap-1.5`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}/>
      {label}
    </Badge>);
};
export default StatusBadge;
