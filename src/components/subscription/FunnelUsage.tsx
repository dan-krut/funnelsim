import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, XCircle, Infinity } from "lucide-react";

interface FunnelUsageProps {
  funnelCount: number;
  funnelLimit: number;
  showIcon?: boolean;
  className?: string;
}

export const FunnelUsage = ({
  funnelCount,
  funnelLimit,
  showIcon = true,
  className,
}: FunnelUsageProps) => {
  // Handle unlimited tier (funnelLimit = -1)
  const isUnlimited = funnelLimit === -1;

  // For unlimited, always show 0% (full capacity available)
  const percentage = isUnlimited
    ? 0
    : funnelLimit > 0
    ? Math.min((funnelCount / funnelLimit) * 100, 100)
    : 0;

  const isWarning = !isUnlimited && percentage >= 80 && percentage < 100;
  const isAtLimit = !isUnlimited && funnelCount >= funnelLimit;
  const isOverLimit = !isUnlimited && funnelCount > funnelLimit;

  const getStatusColor = () => {
    if (isUnlimited) return "text-green-600 dark:text-green-400";
    if (isAtLimit || isOverLimit) return "text-destructive";
    if (isWarning) return "text-yellow-600 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  const getProgressColor = () => {
    if (isUnlimited) return "bg-green-500";
    if (isAtLimit || isOverLimit) return "bg-destructive";
    if (isWarning) return "bg-yellow-500";
    return "bg-primary";
  };

  const getIcon = () => {
    if (!showIcon) return null;

    if (isUnlimited) {
      return <Infinity className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    if (isAtLimit || isOverLimit) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (isWarning) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
  };

  const getLimitText = () => {
    if (isUnlimited) {
      return `${funnelCount} funnels (unlimited)`;
    }
    return `${funnelCount} of ${funnelLimit} funnels used`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className={cn("text-sm font-medium", getStatusColor())}>
            {getLimitText()}
          </span>
        </div>
        {!isUnlimited && (
          <span className={cn("text-sm", getStatusColor())}>
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>

      {!isUnlimited && (
        <Progress
          value={percentage}
          className={cn(
            "h-2",
            (isAtLimit || isOverLimit) && "[&>[role=progressbar]]:bg-destructive",
            isWarning && !isAtLimit && "[&>[role=progressbar]]:bg-yellow-500"
          )}
          aria-label={`Funnel usage: ${funnelCount} of ${funnelLimit}`}
        />
      )}

      {isOverLimit && (
        <p className="text-xs text-destructive">
          You're over your funnel limit. Delete some funnels or upgrade to create new ones.
        </p>
      )}

      {isAtLimit && !isOverLimit && (
        <p className="text-xs text-destructive">
          You've reached your funnel limit. Upgrade to create more funnels.
        </p>
      )}

      {isWarning && !isAtLimit && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          You're approaching your funnel limit. Consider upgrading soon.
        </p>
      )}
    </div>
  );
};
