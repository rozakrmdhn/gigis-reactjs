"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "~/lib/utils"

export interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  trackClassName,
  rangeClassName,
  thumbClassName,
  ...props
}: SliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "bg-slate-800 relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
          trackClassName
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "bg-emerald-500 absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
            rangeClassName
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(
            "border-emerald-500 ring-ring/50 block size-4 shrink-0 rounded-full border-2 bg-slate-950 shadow-sm transition-[color,box-shadow,transform] hover:scale-110 focus-visible:ring-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing",
            thumbClassName
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
