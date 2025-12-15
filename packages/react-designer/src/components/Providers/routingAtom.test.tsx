import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { TemplateProvider } from "./TemplateProvider";
import { routingAtom, DEFAULT_ROUTING, type MessageRouting } from "./store";

describe("routingAtom", () => {
  describe("DEFAULT_ROUTING", () => {
    it("should have sensible default values", () => {
      expect(DEFAULT_ROUTING).toEqual({
        method: "single",
        channels: ["email"],
      });
    });

    it("should be a valid MessageRouting object", () => {
      expect(DEFAULT_ROUTING.method).toBe("single");
      expect(Array.isArray(DEFAULT_ROUTING.channels)).toBe(true);
      expect(DEFAULT_ROUTING.channels.length).toBeGreaterThan(0);
    });
  });

  describe("routingAtom initial value", () => {
    it("should have DEFAULT_ROUTING as initial value", () => {
      const { result } = renderHook(() => useAtomValue(routingAtom), {
        wrapper: ({ children }) => (
          <TemplateProvider templateId="test" tenantId="tenant" token="token">
            {children}
          </TemplateProvider>
        ),
      });

      expect(result.current).toEqual(DEFAULT_ROUTING);
    });
  });

  describe("routingAtom state management", () => {
    it("should allow setting custom routing", () => {
      const { result } = renderHook(() => useAtom(routingAtom), {
        wrapper: ({ children }) => (
          <TemplateProvider templateId="test" tenantId="tenant" token="token">
            {children}
          </TemplateProvider>
        ),
      });

      const customRouting: MessageRouting = {
        method: "all",
        channels: ["email", "sms", "push"],
      };

      act(() => {
        result.current[1](customRouting);
      });

      expect(result.current[0]).toEqual(customRouting);
    });

    it("should allow updating routing method", () => {
      const { result } = renderHook(() => useAtom(routingAtom), {
        wrapper: ({ children }) => (
          <TemplateProvider templateId="test" tenantId="tenant" token="token">
            {children}
          </TemplateProvider>
        ),
      });

      act(() => {
        result.current[1]({ method: "all", channels: ["email"] });
      });

      expect(result.current[0].method).toBe("all");
    });

    it("should allow updating routing channels", () => {
      const { result } = renderHook(() => useAtom(routingAtom), {
        wrapper: ({ children }) => (
          <TemplateProvider templateId="test" tenantId="tenant" token="token">
            {children}
          </TemplateProvider>
        ),
      });

      act(() => {
        result.current[1]({ method: "single", channels: ["sms", "push", "inbox"] });
      });

      expect(result.current[0].channels).toEqual(["sms", "push", "inbox"]);
    });
  });

  describe("routingAtom instance isolation", () => {
    it("should maintain separate routing per TemplateProvider instance", () => {
      const { result: result1 } = renderHook(() => useAtom(routingAtom), {
        wrapper: ({ children }) => (
          <TemplateProvider templateId="test1" tenantId="tenant1" token="token1">
            {children}
          </TemplateProvider>
        ),
      });

      const { result: result2 } = renderHook(() => useAtom(routingAtom), {
        wrapper: ({ children }) => (
          <TemplateProvider templateId="test2" tenantId="tenant2" token="token2">
            {children}
          </TemplateProvider>
        ),
      });

      const routing1: MessageRouting = { method: "single", channels: ["email"] };
      const routing2: MessageRouting = { method: "all", channels: ["sms", "push"] };

      act(() => {
        result1.current[1](routing1);
        result2.current[1](routing2);
      });

      // Each instance should have its own routing
      expect(result1.current[0]).toEqual(routing1);
      expect(result2.current[0]).toEqual(routing2);
      expect(result1.current[0]).not.toEqual(result2.current[0]);
    });
  });

  describe("routingAtom with useSetAtom", () => {
    it("should work with useSetAtom for setting routing", () => {
      const { result: setResult } = renderHook(() => useSetAtom(routingAtom), {
        wrapper: ({ children }) => (
          <TemplateProvider templateId="test" tenantId="tenant" token="token">
            {children}
          </TemplateProvider>
        ),
      });

      const { result: valueResult } = renderHook(() => useAtomValue(routingAtom), {
        wrapper: ({ children }) => (
          <TemplateProvider templateId="test" tenantId="tenant" token="token">
            {children}
          </TemplateProvider>
        ),
      });

      // Note: These are different provider instances, so they have separate stores
      // This test just verifies the hooks work correctly
      expect(typeof setResult.current).toBe("function");
      expect(valueResult.current).toEqual(DEFAULT_ROUTING);
    });
  });
});

