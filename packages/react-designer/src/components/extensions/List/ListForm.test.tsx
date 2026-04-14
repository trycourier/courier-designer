import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ListForm } from "./ListForm";
import { Provider, createStore } from "jotai";
import { sampleDataAtom } from "../../TemplateEditor/store";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import React from "react";

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

function createMockElement(attrs: Record<string, unknown> = {}): ProseMirrorNode {
  return {
    attrs: {
      id: "test-list-id",
      listType: "unordered",
      paddingHorizontal: 0,
      paddingVertical: 0,
      loop: "",
      ...attrs,
    },
    type: { name: "list" },
  } as unknown as ProseMirrorNode;
}

function createMockEditor(): Editor {
  return {
    state: {
      doc: {
        descendants: vi.fn(),
        nodeAt: vi.fn(),
      },
    },
    on: vi.fn(),
    off: vi.fn(),
    chain: vi.fn(() => ({
      command: vi.fn().mockReturnThis(),
      run: vi.fn(),
    })),
    isEditable: true,
  } as unknown as Editor;
}

function TestWrapper({
  children,
  sampleData,
}: {
  children: React.ReactNode;
  sampleData?: Record<string, unknown>;
}) {
  const store = createStore();
  if (sampleData) {
    store.set(sampleDataAtom, sampleData);
  }
  return <Provider store={store}>{children}</Provider>;
}

describe("ListForm", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("loop validation (Zod schema errors)", () => {
    it("should show error for path with invalid characters after debounce", async () => {
      const element = createMockElement({ loop: "" });
      const editor = createMockEditor();

      render(
        <TestWrapper>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      const switchEl = screen.getByRole("switch");
      await act(async () => {
        fireEvent.click(switchEl);
      });

      const textarea = screen.getByPlaceholderText("data.items");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "data items" } });
      });

      // Advance past debounce
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(screen.getByText("Invalid path format")).toBeInTheDocument();
      });
    });

    it("should show error for path not starting with data.", async () => {
      const element = createMockElement({ loop: "" });
      const editor = createMockEditor();

      render(
        <TestWrapper>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      const switchEl = screen.getByRole("switch");
      await act(async () => {
        fireEvent.click(switchEl);
      });

      const textarea = screen.getByPlaceholderText("data.items");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "info.items" } });
      });

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(screen.getByText("Path must start with data.")).toBeInTheDocument();
      });
    });

    it("should not show error for valid path", async () => {
      const element = createMockElement({ loop: "" });
      const editor = createMockEditor();

      render(
        <TestWrapper>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      const switchEl = screen.getByRole("switch");
      await act(async () => {
        fireEvent.click(switchEl);
      });

      const textarea = screen.getByPlaceholderText("data.items");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "data.items" } });
      });

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      expect(screen.queryByText("Invalid path format")).not.toBeInTheDocument();
      expect(screen.queryByText("Path must start with data.")).not.toBeInTheDocument();
    });

    it("should clear errors immediately when user starts typing", async () => {
      const element = createMockElement({ loop: "" });
      const editor = createMockEditor();

      render(
        <TestWrapper>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      const switchEl = screen.getByRole("switch");
      await act(async () => {
        fireEvent.click(switchEl);
      });

      const textarea = screen.getByPlaceholderText("data.items");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "invalid path" } });
      });

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(screen.getByText("Invalid path format")).toBeInTheDocument();
      });

      // Type again — error should clear immediately
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "data.items" } });
      });

      expect(screen.queryByText("Invalid path format")).not.toBeInTheDocument();
    });
  });

  describe("sample data warnings", () => {
    const SAMPLE_DATA = {
      data: {
        items: [{ name: "A" }, { name: "B" }],
        info: { firstName: "John" },
      },
    };

    it("should show warning when path not found in sample data after debounce", async () => {
      const element = createMockElement({ loop: "" });
      const editor = createMockEditor();

      render(
        <TestWrapper sampleData={SAMPLE_DATA}>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      const switchEl = screen.getByRole("switch");
      await act(async () => {
        fireEvent.click(switchEl);
      });

      const textarea = screen.getByPlaceholderText("data.items");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "data.users" } });
      });

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(screen.getByText("Path not found in sample data")).toBeInTheDocument();
      });
    });

    it("should show warning when path resolves to non-array in sample data", async () => {
      const element = createMockElement({ loop: "" });
      const editor = createMockEditor();

      render(
        <TestWrapper sampleData={SAMPLE_DATA}>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      const switchEl = screen.getByRole("switch");
      await act(async () => {
        fireEvent.click(switchEl);
      });

      const textarea = screen.getByPlaceholderText("data.items");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "data.info" } });
      });

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(screen.getByText("Path resolves to a non-array value")).toBeInTheDocument();
      });
    });

    it("should not show warning when path resolves to an array", async () => {
      const element = createMockElement({ loop: "" });
      const editor = createMockEditor();

      render(
        <TestWrapper sampleData={SAMPLE_DATA}>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      const switchEl = screen.getByRole("switch");
      await act(async () => {
        fireEvent.click(switchEl);
      });

      const textarea = screen.getByPlaceholderText("data.items");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "data.items" } });
      });

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      expect(screen.queryByText("Path not found in sample data")).not.toBeInTheDocument();
      expect(screen.queryByText("Path resolves to a non-array value")).not.toBeInTheDocument();
    });

    it("should not show warning when no sampleData is provided", async () => {
      const element = createMockElement({ loop: "" });
      const editor = createMockEditor();

      render(
        <TestWrapper>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      const switchEl = screen.getByRole("switch");
      await act(async () => {
        fireEvent.click(switchEl);
      });

      const textarea = screen.getByPlaceholderText("data.items");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "data.nonexistent" } });
      });

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      expect(screen.queryByText("Path not found in sample data")).not.toBeInTheDocument();
    });
  });

  describe("initial validation on mount", () => {
    it("should validate existing loop value on mount (Zod error)", async () => {
      const element = createMockElement({ loop: "invalid path" });
      const editor = createMockEditor();

      render(
        <TestWrapper>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Invalid path format")).toBeInTheDocument();
      });
    });

    it("should show sample data warning on mount for existing invalid path", async () => {
      const element = createMockElement({ loop: "data.nonexistent" });
      const editor = createMockEditor();

      render(
        <TestWrapper sampleData={{ data: { items: [] } }}>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Path not found in sample data")).toBeInTheDocument();
      });
    });

    it("should show no errors for valid path on mount", async () => {
      const element = createMockElement({ loop: "data.items" });
      const editor = createMockEditor();

      render(
        <TestWrapper sampleData={{ data: { items: [1, 2, 3] } }}>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.queryByText("Invalid path format")).not.toBeInTheDocument();
      expect(screen.queryByText("Path must start with data.")).not.toBeInTheDocument();
      expect(screen.queryByText("Path not found in sample data")).not.toBeInTheDocument();
      expect(screen.queryByText("Path resolves to a non-array value")).not.toBeInTheDocument();
    });
  });

  describe("loop toggle", () => {
    it("should show data path field when loop is enabled", async () => {
      const element = createMockElement({ loop: "" });
      const editor = createMockEditor();

      render(
        <TestWrapper>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      const switchEl = screen.getByRole("switch");
      await act(async () => {
        fireEvent.click(switchEl);
      });

      expect(screen.getByPlaceholderText("data.items")).toBeInTheDocument();
    });

    it("should hide data path field when loop is disabled", () => {
      const element = createMockElement({ loop: "" });
      const editor = createMockEditor();

      render(
        <TestWrapper>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      expect(screen.queryByPlaceholderText("data.items")).not.toBeInTheDocument();
    });

    it("should auto-enable loop toggle when element has a loop value", () => {
      const element = createMockElement({ loop: "data.items" });
      const editor = createMockEditor();

      render(
        <TestWrapper>
          <ListForm element={element} editor={editor} />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText("data.items")).toBeInTheDocument();
    });
  });
});
