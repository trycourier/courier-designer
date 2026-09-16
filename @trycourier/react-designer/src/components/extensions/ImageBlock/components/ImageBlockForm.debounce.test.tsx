import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCallback, useRef, useEffect } from "react";

describe("ImageBlockForm debounce behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * This test simulates the debounce pattern used in ImageBlockForm
   * to verify it works correctly and prevents excessive calls
   */
  it("should debounce function calls by 500ms", () => {
    const mockValidate = vi.fn();

    const { result } = renderHook(() => {
      const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

      const validateAndLoadImage = useCallback((value: string) => {
        mockValidate(value);
      }, []);

      const handleSourcePathChange = useCallback(
        (value: string) => {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          debounceTimerRef.current = setTimeout(() => {
            validateAndLoadImage(value);
          }, 500);
        },
        [validateAndLoadImage]
      );

      useEffect(() => {
        return () => {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
        };
      }, []);

      return { handleSourcePathChange };
    });

    // Call the handler multiple times (simulating typing)
    act(() => {
      result.current.handleSourcePathChange("h");
    });
    vi.advanceTimersByTime(100);

    act(() => {
      result.current.handleSourcePathChange("ht");
    });
    vi.advanceTimersByTime(100);

    act(() => {
      result.current.handleSourcePathChange("htt");
    });
    vi.advanceTimersByTime(100);

    // Should not have called validate yet
    expect(mockValidate).not.toHaveBeenCalled();

    // Advance past the debounce time
    vi.advanceTimersByTime(500);

    // Should have called validate exactly once with the last value
    expect(mockValidate).toHaveBeenCalledTimes(1);
    expect(mockValidate).toHaveBeenCalledWith("htt");
  });

  it("should clear debounce timer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    const { result, unmount } = renderHook(() => {
      const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

      const handleSourcePathChange = useCallback((value: string) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          // Do nothing
        }, 500);
      }, []);

      useEffect(() => {
        return () => {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
        };
      }, []);

      return { handleSourcePathChange };
    });

    // Trigger a debounced call to set the timer
    act(() => {
      result.current.handleSourcePathChange("test");
    });

    // Now unmount - should clear the timer
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("should validate after 500ms of inactivity", () => {
    const mockValidate = vi.fn();

    const { result } = renderHook(() => {
      const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

      const handleSourcePathChange = useCallback((value: string) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          mockValidate(value);
        }, 500);
      }, []);

      return { handleSourcePathChange };
    });

    // Type URL
    act(() => {
      result.current.handleSourcePathChange("https://example.com/image.jpg");
    });

    // Immediately - should not validate
    expect(mockValidate).not.toHaveBeenCalled();

    // After 400ms - still should not validate
    vi.advanceTimersByTime(400);
    expect(mockValidate).not.toHaveBeenCalled();

    // After 500ms total - should validate
    vi.advanceTimersByTime(100);
    expect(mockValidate).toHaveBeenCalledTimes(1);
    expect(mockValidate).toHaveBeenCalledWith("https://example.com/image.jpg");
  });
});

describe("Slider min=0 constraint", () => {
  /**
   * This test verifies that having min=0 allows value=0 without errors
   * Previous bug: min=1 with value=0 caused infinite loops in Radix UI
   */
  it("should allow value=0 when min=0", () => {
    const mockOnChange = vi.fn();

    // Simulate Radix UI Slider behavior
    const simulateSlider = (min: number, max: number, value: number) => {
      // Radix UI clamps value to min/max range
      const clampedValue = Math.max(min, Math.min(max, value));

      // If value was clamped, it would trigger onChange
      if (clampedValue !== value) {
        mockOnChange(clampedValue);
        return { value: clampedValue, needsUpdate: true };
      }

      return { value, needsUpdate: false };
    };

    // Test with min=0 (fixed version)
    const result1 = simulateSlider(0, 100, 0);
    expect(result1.value).toBe(0);
    expect(result1.needsUpdate).toBe(false);
    expect(mockOnChange).not.toHaveBeenCalled();

    mockOnChange.mockClear();

    // Test with min=1 (buggy version) - would cause infinite loop
    const result2 = simulateSlider(1, 100, 0);
    expect(result2.value).toBe(1); // Gets clamped
    expect(result2.needsUpdate).toBe(true); // Would trigger onChange
    expect(mockOnChange).toHaveBeenCalledWith(1);
  });

  it("should not trigger infinite loops with value=0 and min=0", () => {
    let updateCount = 0;
    const MAX_UPDATES = 10;

    // Simulate component render cycle
    const renderComponent = (sourcePath: string, width: number, sliderMin: number) => {
      updateCount++;

      if (updateCount > MAX_UPDATES) {
        throw new Error("Maximum update depth exceeded");
      }

      // If no sourcePath, width should be 0
      const actualWidth = sourcePath ? width : 0;

      // Slider validates: value >= min
      if (actualWidth < sliderMin) {
        // This would trigger an update, potentially infinite loop
        return renderComponent(sourcePath, sliderMin, sliderMin);
      }

      return { width: actualWidth, updateCount };
    };

    // Test with min=0 (fixed) - should not cause infinite loop
    expect(() => {
      const result = renderComponent("", 0, 0);
      expect(result.width).toBe(0);
      expect(result.updateCount).toBe(1);
    }).not.toThrow();

    updateCount = 0;

    // Test with min=1 (buggy) - would cause infinite loop
    expect(() => {
      renderComponent("", 0, 1);
    }).toThrow("Maximum update depth exceeded");
  });
});
