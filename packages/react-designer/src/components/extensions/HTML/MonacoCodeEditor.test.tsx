import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let capturedEditorProps: Record<string, unknown> = {};
let onMountCallback: ((editor: unknown, monaco: unknown) => void) | null = null;
let onChangeCallback: ((value: string | undefined) => void) | null = null;

vi.mock("@monaco-editor/react", () => ({
  Editor: (props: Record<string, unknown>) => {
    capturedEditorProps = props;
    onMountCallback = props.onMount as typeof onMountCallback;
    onChangeCallback = props.onChange as typeof onChangeCallback;
    return <div data-testid="mock-monaco-editor" />;
  },
}));

vi.mock("@/components/ui/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { MonacoCodeEditor } from "./MonacoCodeEditor";

async function renderAndFlushLazy(ui: React.ReactElement) {
  const result = render(ui);
  // Flush the lazy import promise so the Suspense boundary resolves
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

function createMockModel(initialValue: string) {
  let currentValue = initialValue;
  return {
    getValue: vi.fn(() => currentValue),
    setValue: vi.fn((v: string) => {
      currentValue = v;
    }),
    _setCurrentValue(v: string) {
      currentValue = v;
    },
    uri: "test-uri",
  };
}

function createMockMonaco() {
  return {
    editor: {
      getModelMarkers: vi.fn(() => []),
    },
  };
}

function createMockEditor(model: ReturnType<typeof createMockModel>) {
  const contentChangeListeners: (() => void)[] = [];
  return {
    getModel: vi.fn(() => model),
    focus: vi.fn(),
    onDidChangeModelContent: vi.fn((cb: () => void) => {
      contentChangeListeners.push(cb);
    }),
    _fireContentChange() {
      contentChangeListeners.forEach((cb) => cb());
    },
  };
}

describe("MonacoCodeEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedEditorProps = {};
    onMountCallback = null;
    onChangeCallback = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Uncontrolled mode (cursor stability)", () => {
    it("should pass code as defaultValue, not value", async () => {
      const onSave = vi.fn();
      await renderAndFlushLazy(
        <MonacoCodeEditor code="<div>Hello</div>" onSave={onSave} onCancel={() => {}} />
      );

      expect(capturedEditorProps.defaultValue).toBe("<div>Hello</div>");
      expect(capturedEditorProps.value).toBeUndefined();
    });

    it("should not re-set editor content when code prop changes (uncontrolled)", async () => {
      const onSave = vi.fn();
      const { rerender } = await renderAndFlushLazy(
        <MonacoCodeEditor code="<div>Hello</div>" onSave={onSave} onCancel={() => {}} />
      );

      const model = createMockModel("<div>Hello</div>");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      rerender(
        <MonacoCodeEditor code="<div>Changed</div>" onSave={onSave} onCancel={() => {}} />
      );

      // defaultValue only sets the initial value — model.setValue should never
      // be called by the editor wrapper when the prop changes
      expect(model.setValue).not.toHaveBeenCalled();
    });
  });

  describe("Debounced save reads current model value", () => {
    it("should save the current model value, not the stale closure value", async () => {
      const onSave = vi.fn();
      const alwaysValid = () => true;

      await renderAndFlushLazy(
        <MonacoCodeEditor
          code="<div>initial</div>"
          onSave={onSave}
          onCancel={() => {}}
          validator={alwaysValid}
        />
      );

      const model = createMockModel("<div>initial</div>");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      // Simulate user typing — first onChange fires
      act(() => {
        onChangeCallback?.("<div>first</div>");
      });

      // User keeps typing — the model now has newer content
      model._setCurrentValue("<div>first AND second</div>");

      // Advance past debounce (500ms) + validation delay (150ms)
      await act(async () => {
        vi.advanceTimersByTime(700);
      });

      expect(onSave).toHaveBeenCalledTimes(1);
      // The save must use the current model value, not the value from the onChange closure
      expect(onSave).toHaveBeenCalledWith("<div>first AND second</div>");
    });

    it("REGRESSION: should not cause cursor jump by saving stale value during rapid typing", async () => {
      const onSave = vi.fn();
      const alwaysValid = () => true;

      await renderAndFlushLazy(
        <MonacoCodeEditor
          code=""
          onSave={onSave}
          onCancel={() => {}}
          validator={alwaysValid}
        />
      );

      const model = createMockModel("");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      // t=0ms: User types "<div>"
      model._setCurrentValue("<div>");
      act(() => {
        onChangeCallback?.("<div>");
      });

      // t=200ms: User types "Hello" in the middle → "<div>Hello"
      vi.advanceTimersByTime(200);
      model._setCurrentValue("<div>Hello");
      act(() => {
        onChangeCallback?.("<div>Hello");
      });

      // t=400ms: User types " World" → "<div>Hello World"
      vi.advanceTimersByTime(200);
      model._setCurrentValue("<div>Hello World");
      act(() => {
        onChangeCallback?.("<div>Hello World");
      });

      // t=500ms: Not enough time since last keystroke for debounce to fire
      vi.advanceTimersByTime(100);
      expect(onSave).not.toHaveBeenCalled();

      // User types "</div>" at t=550ms, model now has the full content
      vi.advanceTimersByTime(50);
      model._setCurrentValue("<div>Hello World</div>");
      act(() => {
        onChangeCallback?.("<div>Hello World</div>");
      });

      // t=1050ms: 500ms debounce fires from last keystroke
      vi.advanceTimersByTime(500);
      // t=1200ms: 150ms validation delay
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith("<div>Hello World</div>");
    });
  });

  describe("Debounce timing", () => {
    it("should not save before debounce period elapses", async () => {
      const onSave = vi.fn();
      const alwaysValid = () => true;

      await renderAndFlushLazy(
        <MonacoCodeEditor
          code=""
          onSave={onSave}
          onCancel={() => {}}
          validator={alwaysValid}
        />
      );

      const model = createMockModel("");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      model._setCurrentValue("<p>test</p>");
      act(() => {
        onChangeCallback?.("<p>test</p>");
      });

      // At 400ms — still within debounce window
      vi.advanceTimersByTime(400);
      expect(onSave).not.toHaveBeenCalled();
    });

    it("should save after debounce (500ms) + validation delay (150ms)", async () => {
      const onSave = vi.fn();
      const alwaysValid = () => true;

      await renderAndFlushLazy(
        <MonacoCodeEditor
          code=""
          onSave={onSave}
          onCancel={() => {}}
          validator={alwaysValid}
        />
      );

      const model = createMockModel("<p>test</p>");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      act(() => {
        onChangeCallback?.("<p>test</p>");
      });

      // Advance past debounce (500ms) but not past validation delay
      vi.advanceTimersByTime(500);
      expect(onSave).not.toHaveBeenCalled();

      // Advance past validation delay (150ms)
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it("should reset debounce timer on each keystroke", async () => {
      const onSave = vi.fn();
      const alwaysValid = () => true;

      await renderAndFlushLazy(
        <MonacoCodeEditor
          code=""
          onSave={onSave}
          onCancel={() => {}}
          validator={alwaysValid}
        />
      );

      const model = createMockModel("");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      // First keystroke at t=0
      act(() => {
        onChangeCallback?.("a");
      });

      // Second keystroke at t=300ms — resets debounce
      vi.advanceTimersByTime(300);
      act(() => {
        onChangeCallback?.("ab");
      });

      // t=600ms: 300ms since last keystroke — debounce hasn't fired yet (needs 500ms)
      vi.advanceTimersByTime(300);
      expect(onSave).not.toHaveBeenCalled();

      // t=800ms: 500ms since last keystroke — debounce fires
      model._setCurrentValue("ab");
      vi.advanceTimersByTime(200);

      // t=950ms: validation delay
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith("ab");
    });
  });

  describe("Validation gating", () => {
    it("should not save when validator returns false", async () => {
      const onSave = vi.fn();
      const alwaysInvalid = () => false;

      await renderAndFlushLazy(
        <MonacoCodeEditor
          code=""
          onSave={onSave}
          onCancel={() => {}}
          validator={alwaysInvalid}
        />
      );

      const model = createMockModel("<div");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      act(() => {
        onChangeCallback?.("<div");
      });

      await act(async () => {
        vi.advanceTimersByTime(700);
      });

      expect(onSave).not.toHaveBeenCalled();
    });

    it("should save when validator returns true", async () => {
      const onSave = vi.fn();
      const alwaysValid = () => true;

      await renderAndFlushLazy(
        <MonacoCodeEditor
          code=""
          onSave={onSave}
          onCancel={() => {}}
          validator={alwaysValid}
        />
      );

      const model = createMockModel("<div>ok</div>");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      act(() => {
        onChangeCallback?.("<div>ok</div>");
      });

      await act(async () => {
        vi.advanceTimersByTime(700);
      });

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it("should report validation state changes via onValidationChange", async () => {
      const onSave = vi.fn();
      const onValidationChange = vi.fn();
      const alwaysInvalid = () => false;

      await renderAndFlushLazy(
        <MonacoCodeEditor
          code=""
          onSave={onSave}
          onCancel={() => {}}
          validator={alwaysInvalid}
          onValidationChange={onValidationChange}
        />
      );

      const model = createMockModel("<div");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      // Initial validation check fires after 100ms on mount
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(onValidationChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Editor initialization", () => {
    it("should focus the editor on mount", async () => {
      const onSave = vi.fn();
      await renderAndFlushLazy(
        <MonacoCodeEditor code="<p>test</p>" onSave={onSave} onCancel={() => {}} />
      );

      const model = createMockModel("<p>test</p>");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      expect(mockEditor.focus).toHaveBeenCalledTimes(1);
    });

    it("should register content change listener on mount", async () => {
      const onSave = vi.fn();
      await renderAndFlushLazy(
        <MonacoCodeEditor code="<p>test</p>" onSave={onSave} onCancel={() => {}} />
      );

      const model = createMockModel("<p>test</p>");
      const mockEditor = createMockEditor(model);
      const mockMonaco = createMockMonaco();

      act(() => {
        onMountCallback?.(mockEditor, mockMonaco);
      });

      expect(mockEditor.onDidChangeModelContent).toHaveBeenCalledTimes(1);
    });

    it("should use html as default language", async () => {
      const onSave = vi.fn();
      await renderAndFlushLazy(
        <MonacoCodeEditor code="" onSave={onSave} onCancel={() => {}} />
      );

      expect(capturedEditorProps.defaultLanguage).toBe("html");
    });
  });
});
