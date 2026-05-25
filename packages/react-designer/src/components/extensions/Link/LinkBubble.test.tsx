import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { createElement } from "react";
import { pendingLinkAtom, setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import { LinkBubble } from "./LinkBubble";

const mockEditor = {
  commands: {
    setTextSelection: vi.fn(),
    unsetLink: vi.fn(),
    focus: vi.fn(),
  },
  chain: vi.fn(() => ({
    focus: vi.fn().mockReturnThis(),
    unsetLink: vi.fn().mockReturnThis(),
    setTextSelection: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    run: vi.fn(),
  })),
  view: {
    dom: {
      closest: vi.fn(() => ({
        getBoundingClientRect: () => ({ top: 100, left: 50, bottom: 200, right: 400 }),
      })),
    },
    coordsAtPos: vi.fn(() => ({ top: 120, bottom: 140, left: 60, right: 200 })),
  },
};

vi.mock("@tiptap/react", () => ({
  useCurrentEditor: () => ({ editor: mockEditor }),
}));

function renderWithStore(pendingLink: { mark?: any; link?: { from: number; to: number } } | null) {
  const store = createStore();
  store.set(pendingLinkAtom, pendingLink);

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(Provider, { store }, children);

  return { ...render(createElement(LinkBubble), { wrapper }), store };
}

describe("LinkBubble", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when pendingLink is null", () => {
    const { container } = renderWithStore(null);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when pendingLink has no link range", () => {
    const { container } = renderWithStore({ mark: undefined });
    expect(container.innerHTML).toBe("");
  });

  it("renders the popup when pendingLink.link is set", () => {
    renderWithStore({ link: { from: 1, to: 5 } });
    expect(screen.getByPlaceholderText("Paste a link...")).toBeInTheDocument();
  });

  it("pre-fills URL from existing mark href", () => {
    renderWithStore({
      link: { from: 1, to: 5 },
      mark: { attrs: { href: "https://example.com", target: null } },
    });
    const input = screen.getByPlaceholderText("Paste a link...") as HTMLInputElement;
    expect(input.value).toBe("https://example.com");
  });

  it("shows empty input for new link (no mark)", () => {
    renderWithStore({ link: { from: 1, to: 5 } });
    const input = screen.getByPlaceholderText("Paste a link...") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("calls editor chain on save with Enter key", async () => {
    renderWithStore({ link: { from: 1, to: 5 } });
    const input = screen.getByPlaceholderText("Paste a link...");

    fireEvent.change(input, { target: { value: "https://test.com" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockEditor.chain).toHaveBeenCalled();
  });

  it("calls unsetLink when saving with empty URL", () => {
    renderWithStore({ link: { from: 1, to: 5 } });
    const input = screen.getByPlaceholderText("Paste a link...");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockEditor.commands.setTextSelection).toHaveBeenCalledWith({ from: 1, to: 5 });
    expect(mockEditor.commands.unsetLink).toHaveBeenCalled();
  });

  it("dismisses popup on Escape key", () => {
    const { store } = renderWithStore({ link: { from: 1, to: 5 } });
    const input = screen.getByPlaceholderText("Paste a link...");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(store.get(pendingLinkAtom)).toBeNull();
    expect(mockEditor.commands.focus).toHaveBeenCalled();
  });

  it("renders Save, Open link, and Remove buttons", () => {
    renderWithStore({ link: { from: 1, to: 5 } });
    expect(screen.getByTitle("Save link")).toBeInTheDocument();
    expect(screen.getByTitle("Open link")).toBeInTheDocument();
    expect(screen.getByTitle("Remove link")).toBeInTheDocument();
  });

  it("disables Open link button when URL is empty", () => {
    renderWithStore({ link: { from: 1, to: 5 } });
    const openBtn = screen.getByTitle("Open link");
    expect(openBtn).toBeDisabled();
  });

  it("disables Remove button when no existing mark", () => {
    renderWithStore({ link: { from: 1, to: 5 } });
    const removeBtn = screen.getByTitle("Remove link");
    expect(removeBtn).toBeDisabled();
  });

  it("enables Remove button when mark exists", () => {
    renderWithStore({
      link: { from: 1, to: 5 },
      mark: { attrs: { href: "https://example.com", target: null } },
    });
    const removeBtn = screen.getByTitle("Remove link");
    expect(removeBtn).not.toBeDisabled();
  });

  it("removes link and clears pendingLink on Remove click", () => {
    const { store } = renderWithStore({
      link: { from: 1, to: 5 },
      mark: { attrs: { href: "https://example.com", target: null } },
    });

    const removeBtn = screen.getByTitle("Remove link");
    fireEvent.mouseDown(removeBtn);

    expect(mockEditor.commands.setTextSelection).toHaveBeenCalledWith({ from: 1, to: 5 });
    expect(mockEditor.commands.unsetLink).toHaveBeenCalled();
    expect(store.get(pendingLinkAtom)).toBeNull();
  });

  it("opens link in new tab on Open link click", () => {
    const windowOpen = vi.spyOn(window, "open").mockImplementation(() => null);

    renderWithStore({
      link: { from: 1, to: 5 },
      mark: { attrs: { href: "https://example.com", target: null } },
    });

    const input = screen.getByPlaceholderText("Paste a link...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "https://example.com" } });

    const openBtn = screen.getByTitle("Open link");
    fireEvent.mouseDown(openBtn);

    expect(windowOpen).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer"
    );

    windowOpen.mockRestore();
  });
});
