import { cn } from '@/lib/utils'
import type { HTMLProps } from 'react'
import { forwardRef } from 'react'

export const Spinner = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(({ className, ...rest }, ref) => {
  const spinnerClass = cn('courier-animate-spin courier-rounded-full courier-border-2 courier-border-current courier-border-t-transparent courier-h-4 courier-w-4', className)

  return <div className={spinnerClass} ref={ref} {...rest} />
})

Spinner.displayName = 'Spinner'
