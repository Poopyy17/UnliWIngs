import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const TARGET_TIME = 15;
const COMPLETED_STATUSES = ['completed', 'paid'];

export const OrderTimer = ({ startTime, status }) => {
  const [elapsed, setElapsed] = useState(0);
  const finalTimeRef = useRef(null);
  const isCompleted = COMPLETED_STATUSES.includes(status);

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();

    // Calculate and store final time when completed
    if (isCompleted && !finalTimeRef.current) {
      const completedTime = Date.now() - start;
      finalTimeRef.current = completedTime;
      setElapsed(completedTime);
      return;
    }

    // Continue counting if not completed
    if (!isCompleted) {
      setElapsed(Date.now() - start);
      const interval = setInterval(() => {
        setElapsed(Date.now() - start);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, status, isCompleted]);

  const minutes = Math.floor((finalTimeRef.current || elapsed) / 60000);
  const seconds = Math.floor(
    ((finalTimeRef.current || elapsed) % 60000) / 1000
  );
  const progress = Math.min((minutes / TARGET_TIME) * 100, 100);

  const getTimeColor = () => {
    if (isCompleted) return 'text-gray-500';
    if (minutes >= TARGET_TIME) return 'text-red-500';
    if (minutes >= TARGET_TIME * 0.7) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatTime = () => {
    if (isNaN(minutes)) return '00:00';
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (isCompleted) {
      return `Completed in ${formatTime()}`;
    }
    return minutes >= TARGET_TIME ? 'Delayed' : 'On Time';
  };

  return (
    <div className="flex items-center gap-2">
      <Clock className={cn('h-4 w-4', getTimeColor())} />
      <div className="flex flex-col gap-1 min-w-[150px]">
        <div className="flex justify-between items-center">
          <span className={cn('text-sm font-medium', getTimeColor())}>
            {formatTime()}
          </span>
          <span className="text-xs text-muted-foreground">
            {getStatusText()}
          </span>
        </div>
        <Progress
          value={progress}
          className={cn(
            'h-1.5',
            isCompleted
              ? 'bg-gray-200'
              : progress >= 100
              ? 'bg-red-200'
              : 'bg-green-200',
            'transition-all'
          )}
          indicatorClassName={cn(
            isCompleted
              ? 'bg-gray-500'
              : progress >= 100
              ? 'bg-red-500'
              : 'bg-green-500'
          )}
        />
      </div>
    </div>
  );
};
