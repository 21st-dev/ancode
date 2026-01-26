import { IconTextUndo } from "../../../components/ui/icons"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip"
import { cn } from "../../../lib/utils"

interface RollbackButtonProps {
  disabled?: boolean
  onRollback: () => void
  isRollingBack?: boolean
}

/**
 * Rollback button component with tooltip.
 * Allows users to rollback chat state to a specific message.
 */
export function RollbackButton({
  disabled = false,
  onRollback,
  isRollingBack = false,
}: RollbackButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onRollback}
          disabled={disabled || isRollingBack}
          tabIndex={-1}
          className={cn(
            "p-1.5 rounded-md transition-[background-color,transform] duration-150 ease-out hover:bg-accent active:scale-[0.97]",
            isRollingBack && "opacity-50 cursor-not-allowed",
          )}
        >
          <IconTextUndo className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isRollingBack ? "Rolling back..." : "Rollback to here"}
      </TooltipContent>
    </Tooltip>
  )
}
