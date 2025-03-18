import { render, renderHook, act } from '@testing-library/react'
import { useForwardedRefCallback } from './useForwardedRefCallback'
import { createRef, forwardRef } from 'react'
import { describe, it, expect, vi } from 'vitest'

describe('useForwardedRefCallback', () => {
  it('should handle function ref', async () => {
    const refCallback = vi.fn()
    const { result } = renderHook(() => useForwardedRefCallback(refCallback))

    const testNode = document.createElement('div')
    await act(async () => {
      result.current.setRef(testNode)
    })

    expect(refCallback).toHaveBeenCalledWith(testNode)
    expect(result.current.componentContainer).toBe(testNode)
  })

  it('should handle object ref', async () => {
    const objRef = createRef<HTMLDivElement>()
    const { result } = renderHook(() => useForwardedRefCallback(objRef))

    const testNode = document.createElement('div')
    await act(async () => {
      result.current.setRef(testNode)
    })

    expect(objRef.current).toBe(testNode)
    expect(result.current.componentContainer).toBe(testNode)
  })

  it('should work with null ref', async () => {
    const { result } = renderHook(() => useForwardedRefCallback(null))

    const testNode = document.createElement('div')
    await act(async () => {
      result.current.setRef(testNode)
    })

    expect(result.current.componentContainer).toBe(testNode)
  })

  it('should work in a real component scenario', async () => {
    const TestComponent = forwardRef<HTMLDivElement>((props, ref) => {
      const { setRef } = useForwardedRefCallback(ref)
      return <div ref={setRef} data-testid="test-div" />
    })

    const ref = createRef<HTMLDivElement>()
    const { getByTestId } = render(<TestComponent ref={ref} />)

    const divElement = getByTestId('test-div')
    expect(ref.current).toBe(divElement)
  })
}) 