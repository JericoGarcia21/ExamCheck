import type { ReactElement } from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

export function Tooltip({ children, content }: { children: ReactElement; content: string }) {
  return (
    <TooltipPrimitive.Provider delay={350}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger render={children} />
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side="top" sideOffset={8} className="z-[100]">
            <TooltipPrimitive.Popup className="max-w-64 rounded-md bg-foreground px-3 py-2 text-xs leading-relaxed text-background shadow-md">
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
