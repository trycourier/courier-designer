import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ElementalContent } from "@/types";
import { collectTemplateIssues } from "@/lib/utils/handlebars/templateIssues";
import { renderVariablesInHtmlString } from "../../utils/htmlBlockVariables";

/**
 * Outlook conditional comments (`<!--[if mso]> … <![endif]-->`) are ordinary email
 * HTML and must keep saving. courier-designer#219 rejected every one of them, so a
 * customer HTML block with a well-formed conditional (Seth's report, 2026-10-01)
 * could no longer be edited. Nothing covered this before; these pin it across the
 * code editor's save, the template issues that gate Publish, and the canvas render.
 */

let onMountCallback: ((editor: unknown, monaco: unknown) => void) | null = null;
let onChangeCallback: ((value: string | undefined) => void) | null = null;

vi.mock("@monaco-editor/react", () => ({
  Editor: (props: Record<string, unknown>) => {
    onMountCallback = props.onMount as typeof onMountCallback;
    onChangeCallback = props.onChange as typeof onChangeCallback;
    return <div data-testid="mock-monaco-editor" />;
  },
}));

vi.mock("@/components/ui/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { MonacoCodeEditor, defaultHTMLValidator } from "./MonacoCodeEditor";

// Verbatim from the report.
const sethSnippet = `            <!--[if mso]>
              <div style="padding:12px 16px; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#31353F;">
                <a href="https://{{link_domain}}/sell/{{deal.supply_intent.public_id}}/action/in-market" style="color:#31353F; text-decoration:none;">In Market</a>
              </div>
            <![endif]-->`;

// The common "ghost table" wrapper: Outlook gets a fixed-width table, with handlebars inside.
const ghostTable = `<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<div style="max-width:600px">{{#if data.name}}Hi {{data.name}}{{else}}Hi there{{/if}}</div>
<!--[if mso]></td></tr></table><![endif]-->`;

const cases = [
  ["Seth's report", sethSnippet],
  ["a ghost-table wrapper with handlebars", ghostTable],
] as const;

const htmlTemplate = (html: string) =>
  ({
    version: "2022-01-01",
    elements: [{ type: "channel", channel: "email", elements: [{ type: "html", content: html }] }],
  }) as unknown as ElementalContent;

function mockEditor(value: string) {
  let current = value;
  const listeners: (() => void)[] = [];
  const model = { getValue: () => current, uri: "test-uri" };
  return {
    setValue(next: string) {
      current = next;
      listeners.forEach((listener) => listener());
    },
    editor: {
      getModel: () => model,
      focus: vi.fn(),
      onDidChangeModelContent: (listener: () => void) => listeners.push(listener),
    },
  };
}

describe("Outlook conditional comments in an HTML block", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    onMountCallback = null;
    onChangeCallback = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(cases)("%s passes the default validator", (_, html) => {
    const monaco = { editor: { getModelMarkers: () => [] } };
    const editor = { getModel: () => ({ uri: "test-uri" }) };

    expect(defaultHTMLValidator(html, editor as never, monaco as never)).toBe(true);
  });

  it.each(cases)("%s is saved when typed into the code editor", async (_, html) => {
    const onSave = vi.fn();
    render(<MonacoCodeEditor code="" onSave={onSave} onCancel={() => {}} />);
    await act(async () => {
      await Promise.resolve();
    });

    const mock = mockEditor("");
    act(() => {
      onMountCallback?.(mock.editor, { editor: { getModelMarkers: () => [] } });
    });

    act(() => {
      mock.setValue(html);
      onChangeCallback?.(html);
    });
    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(onSave).toHaveBeenCalledWith(html);
  });

  it.each(cases)("%s raises no blocking template issue", (_, html) => {
    const blocking = collectTemplateIssues(htmlTemplate(html)).filter(
      (issue) => issue.severity === "blocking"
    );

    expect(blocking).toEqual([]);
  });

  it.each(cases)("%s keeps its conditional comments when drawn on the canvas", (_, html) => {
    const out = renderVariablesInHtmlString(html, {}, "show-variables");

    expect(out).toContain("<!--[if mso]>");
    expect(out).toContain("<![endif]-->");
  });
});
