import * as React from "react"
import { cn } from "../../lib/utils"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  fill?: string
}

/**
 * 2code Logo - A stylized "2" integrated with code brackets
 * Design: The "2" flows into angle brackets representing code
 */
export function Logo({ fill = "currentColor", className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full", className)}
      aria-label="2code logo"
      {...props}
    >
      {/* Stylized "2" with integrated code brackets */}
      <path
        d="M80 120C80 75.8172 115.817 40 160 40H240C284.183 40 320 75.8172 320 120V160C320 182.091 302.091 200 280 200H160L280 320H320C342.091 320 360 337.909 360 360H80V320H240L120 200V160C120 137.909 137.909 120 160 120H240C262.091 120 280 102.091 280 80H160C137.909 80 120 97.9086 120 120H80Z"
        fill={fill}
      />
      {/* Opening code bracket < */}
      <path
        d="M40 200L100 140V172L64 200L100 228V260L40 200Z"
        fill={fill}
        opacity="0.6"
      />
      {/* Closing code bracket > */}
      <path
        d="M360 200L300 140V172L336 200L300 228V260L360 200Z"
        fill={fill}
        opacity="0.6"
      />
    </svg>
  )
}

/**
 * Original 21st Logo (kept for backward compatibility)
 */
export function Logo21st({ fill = "currentColor", className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full", className)}
      aria-label="21st logo"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M358.333 0C381.345 0 400 18.6548 400 41.6667V295.833C400 298.135 398.134 300 395.833 300H270.833C268.532 300 266.667 301.865 266.667 304.167V395.833C266.667 398.134 264.801 400 262.5 400H41.6667C18.6548 400 0 381.345 0 358.333V304.72C0 301.793 1.54269 299.081 4.05273 297.575L153.76 207.747C157.159 205.708 156.02 200.679 152.376 200.065L151.628 200H4.16667C1.86548 200 6.71103e-08 198.135 0 195.833V104.167C1.07376e-06 101.865 1.86548 100 4.16667 100H162.5C164.801 100 166.667 98.1345 166.667 95.8333V4.16667C166.667 1.86548 168.532 1.00666e-07 170.833 0H358.333ZM170.833 100C168.532 100 166.667 101.865 166.667 104.167V295.833C166.667 298.135 168.532 300 170.833 300H262.5C264.801 300 266.667 298.135 266.667 295.833V104.167C266.667 101.865 264.801 100 262.5 100H170.833Z"
        fill={fill}
      />
    </svg>
  )
}
