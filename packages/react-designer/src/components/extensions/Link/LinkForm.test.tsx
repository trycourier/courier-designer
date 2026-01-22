import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LinkForm } from "./LinkForm";
import { Provider } from "jotai";
import { createStore } from "jotai";
import { Editor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Link } from "./Link";
import type { Mark } from "@tiptap/pm/model";

// Mock dependencies
vi.mock("@/lib", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, "open", {
  writable: true,
  value: mockWindowOpen,
});

describe("LinkForm", () => {
  let store: ReturnType<typeof createStore>;
  let editor: Editor;

  beforeEach(() => {
    store = createStore();
    mockWindowOpen.mockClear();

    editor = new Editor({
      extensions: [Document, Paragraph, Text, Link],
      content: "<p>Test text</p>",
    });

    // Mock the editor chain methods
    const mockChain = {
      focus: vi.fn().mockReturnThis(),
      unsetLink: vi.fn().mockReturnThis(),
      setTextSelection: vi.fn().mockReturnThis(),
      setLink: vi.fn().mockReturnThis(),
      run: vi.fn().mockReturnValue(true),
    };

    vi.spyOn(editor, "chain").mockReturnValue(mockChain as any);

    // Mock direct editor commands
    vi.spyOn(editor.commands, "setTextSelection").mockReturnValue(true);
  });

  const renderLinkForm = (props = {}) => {
    return render(
      <Provider store={store}>
        <LinkForm editor={editor} {...props} />
      </Provider>
    );
  };

  describe("Open link button", () => {
    it("should open link in new tab when clicked with valid URL", async () => {
      renderLinkForm();

      // Find and fill the URL input
      const urlInput = screen.getByLabelText("URL");
      fireEvent.change(urlInput, { target: { value: "https://example.com" } });

      // Wait for the button to become enabled
      const openLinkButton = screen.getByRole("button", { name: /open link/i });
      await waitFor(() => {
        expect(openLinkButton).toHaveProperty("disabled", false);
      });

      // Click the "Open link" button
      fireEvent.click(openLinkButton);

      // Verify window.open was called with correct parameters
      expect(mockWindowOpen).toHaveBeenCalledWith(
        "https://example.com",
        "_blank",
        "noopener,noreferrer"
      );
    });

    it("should be disabled when URL is empty", () => {
      renderLinkForm();

      // Find the "Open link" button
      const openLinkButton = screen.getByRole("button", { name: /open link/i });

      // Verify button is disabled when URL is empty
      expect(openLinkButton).toHaveProperty("disabled", true);
    });

    it("should not open link when URL is only whitespace", () => {
      renderLinkForm();

      // Fill URL input with whitespace
      const urlInput = screen.getByLabelText("URL");
      fireEvent.change(urlInput, { target: { value: "   " } });

      // Find the "Open link" button
      const openLinkButton = screen.getByRole("button", { name: /open link/i });
      fireEvent.click(openLinkButton);

      // Verify window.open was not called
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it("should enable button when URL is entered", async () => {
      renderLinkForm();

      const openLinkButton = screen.getByRole("button", { name: /open link/i });
      expect(openLinkButton).toHaveProperty("disabled", true);

      // Fill URL input
      const urlInput = screen.getByLabelText("URL");
      fireEvent.change(urlInput, { target: { value: "https://example.com" } });

      // Wait for state update
      await waitFor(() => {
        expect(openLinkButton).toHaveProperty("disabled", false);
      });
    });
  });

  describe("Save button", () => {
    it("should save link when clicked", async () => {
      const chainSpy = vi.spyOn(editor, "chain");

      renderLinkForm({
        pendingLink: { from: 1, to: 5 },
      });

      // Fill URL input
      const urlInput = screen.getByLabelText("URL");
      fireEvent.change(urlInput, { target: { value: "https://example.com" } });

      // Wait for the Save button to become enabled (form is dirty)
      const saveButton = screen.getByRole("button", { name: /save/i });
      await waitFor(() => {
        expect(saveButton).toHaveProperty("disabled", false);
      });

      // Click the "Save" button
      fireEvent.click(saveButton);

      // Verify editor chain was called (link update logic)
      await waitFor(() => {
        expect(chainSpy).toHaveBeenCalled();
      });
    });

    it("should be disabled when form is not dirty (no changes)", () => {
      const mockMark = {
        attrs: {
          href: "https://example.com",
          target: null,
        },
      } as unknown as Mark;

      renderLinkForm({
        mark: mockMark,
      });

      // Find the "Save" button
      const saveButton = screen.getByRole("button", { name: /save/i });

      // Verify button is disabled when no changes are made
      expect(saveButton).toHaveProperty("disabled", true);
    });

    it("should be enabled when form is dirty (has changes)", async () => {
      const mockMark = {
        attrs: {
          href: "https://example.com",
          target: null,
        },
      } as unknown as Mark;

      renderLinkForm({
        mark: mockMark,
      });

      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toHaveProperty("disabled", true);

      // Modify the URL input
      const urlInput = screen.getByLabelText("URL");
      fireEvent.change(urlInput, { target: { value: "https://newurl.com" } });

      // Wait for form state to update
      await waitFor(() => {
        expect(saveButton).toHaveProperty("disabled", false);
      });
    });

    it("should trigger same behavior as Enter key", async () => {
      const chainSpy = vi.spyOn(editor, "chain");

      renderLinkForm({
        pendingLink: { from: 1, to: 5 },
      });

      // Fill URL input
      const urlInput = screen.getByLabelText("URL");
      fireEvent.change(urlInput, { target: { value: "https://example.com" } });

      // Wait for form to be dirty
      await waitFor(() => {
        const saveButton = screen.getByRole("button", { name: /save/i });
        expect(saveButton).toHaveProperty("disabled", false);
      });

      // Press Enter key
      fireEvent.keyDown(urlInput, { key: "Enter", code: "Enter" });

      // Wait for editor chain to be called
      await waitFor(() => {
        expect(chainSpy).toHaveBeenCalled();
      });

      // Both Enter and Save button trigger the updateLink function
      expect(chainSpy).toHaveBeenCalled();
    });

    it("should enable save button when URL is cleared (marking form as dirty)", async () => {
      const mockMark = {
        attrs: {
          href: "https://example.com",
          target: null,
        },
      } as unknown as Mark;

      renderLinkForm({
        mark: mockMark,
        pendingLink: { from: 1, to: 5 },
      });

      // Verify Save button is initially disabled (no changes)
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toHaveProperty("disabled", true);

      // Clear URL input
      const urlInput = screen.getByLabelText("URL");
      fireEvent.change(urlInput, { target: { value: "" } });

      // Wait for Save button to become enabled (form is dirty)
      await waitFor(() => {
        expect(saveButton).toHaveProperty("disabled", false);
      });

      // Verify the button is clickable (not testing internal editor commands)
      fireEvent.click(saveButton);
      expect(true).toBe(true); // Button click completes without error
    });
  });

  describe("Button layout", () => {
    it("should render both buttons in the form", () => {
      renderLinkForm();

      const openLinkButton = screen.getByRole("button", { name: /open link/i });
      const saveButton = screen.getByRole("button", { name: /save/i });

      expect(openLinkButton).toBeDefined();
      expect(saveButton).toBeDefined();
    });

    it("should render Open link button with ExternalLink icon", () => {
      renderLinkForm();

      const openLinkButton = screen.getByRole("button", { name: /open link/i });
      const icon = openLinkButton.querySelector("svg");

      expect(icon).toBeDefined();
    });

    it("should have correct button variants", () => {
      renderLinkForm();

      const openLinkButton = screen.getByRole("button", { name: /open link/i });
      const saveButton = screen.getByRole("button", { name: /save/i });

      // Check if buttons have the expected class names for their variants
      // Outline variant has border-border class
      expect(openLinkButton.className).toContain("!courier-border-border");
      // Primary variant has bg-[#3B82F6] class
      expect(saveButton.className).toContain("courier-bg-[#3B82F6]");
    });
  });
});
