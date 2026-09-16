import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConditions, isStructuredCondition } from "./useConditions";
import type { ElementalConditionExpression } from "@/types/conditions.types";

describe("isStructuredCondition", () => {
  it("returns true for an array", () => {
    const expr: ElementalConditionExpression = [
      {
        conditions: [{ property: "data.x", operator: "equals", value: "1" }],
        logical_operator: "and",
      },
    ];
    expect(isStructuredCondition(expr)).toBe(true);
  });

  it("returns false for a string", () => {
    expect(isStructuredCondition("{= data.show}")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isStructuredCondition(undefined)).toBe(false);
  });
});

describe("useConditions", () => {
  it("initialises groups from structured value", () => {
    const structured: ElementalConditionExpression = [
      {
        conditions: [{ property: "data.plan", operator: "equals", value: "pro" }],
        logical_operator: "and",
      },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditions(structured, onChange));

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].conditions[0].property).toBe("data.plan");
  });

  it("initialises empty groups from string value", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditions("{= data.show}", onChange));

    expect(result.current.groups).toHaveLength(0);
  });

  it("initStructured creates a default group", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditions(undefined, onChange));

    act(() => {
      result.current.initStructured();
    });

    expect(onChange).toHaveBeenCalledWith([
      {
        conditions: [{ property: "", operator: "equals", value: "" }],
        logical_operator: "and",
      },
    ]);
  });

  it("addGroup appends a new group", () => {
    const initial: ElementalConditionExpression = [
      {
        conditions: [{ property: "data.a", operator: "equals", value: "1" }],
        logical_operator: "and",
      },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditions(initial, onChange));

    act(() => {
      result.current.addGroup();
    });

    const call = onChange.mock.calls[0][0] as ElementalConditionExpression;
    expect(call).toHaveLength(2);
  });

  it("removeGroup removes a group and clears if empty", () => {
    const initial: ElementalConditionExpression = [
      {
        conditions: [{ property: "data.a", operator: "equals", value: "1" }],
        logical_operator: "and",
      },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditions(initial, onChange));

    act(() => {
      result.current.removeGroup(0);
    });

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("updateCondition changes a condition field", () => {
    const initial: ElementalConditionExpression = [
      {
        conditions: [{ property: "data.a", operator: "equals", value: "1" }],
        logical_operator: "and",
      },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditions(initial, onChange));

    act(() => {
      result.current.updateCondition(0, 0, { property: "data.b", operator: "equals", value: "1" });
    });

    const call = onChange.mock.calls[0][0] as ElementalConditionExpression;
    expect(call[0].conditions[0].property).toBe("data.b");
    expect(call[0].conditions[0].operator).toBe("equals");
    expect(call[0].conditions[0].value).toBe("1");
  });

  it("addCondition adds a condition to a group", () => {
    const initial: ElementalConditionExpression = [
      {
        conditions: [{ property: "data.a", operator: "equals", value: "1" }],
        logical_operator: "and",
      },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditions(initial, onChange));

    act(() => {
      result.current.addCondition(0);
    });

    const call = onChange.mock.calls[0][0] as ElementalConditionExpression;
    expect(call[0].conditions).toHaveLength(2);
  });

  it("removeCondition removes a condition and clears group if empty", () => {
    const initial: ElementalConditionExpression = [
      {
        conditions: [{ property: "data.a", operator: "equals", value: "1" }],
        logical_operator: "and",
      },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditions(initial, onChange));

    act(() => {
      result.current.removeCondition(0, 0);
    });

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("updateGroupOperator toggles the logical operator", () => {
    const initial: ElementalConditionExpression = [
      {
        conditions: [{ property: "data.a", operator: "equals", value: "1" }],
        logical_operator: "and",
      },
    ];
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditions(initial, onChange));

    act(() => {
      result.current.updateGroupOperator(0, "or");
    });

    const call = onChange.mock.calls[0][0] as ElementalConditionExpression;
    expect(call[0].logical_operator).toBe("or");
  });

  it("switchToRaw converts to string mode", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useConditions(undefined, onChange));

    act(() => {
      result.current.switchToRaw("{= data.show}");
    });

    expect(onChange).toHaveBeenCalledWith("{= data.show}");
  });
});
