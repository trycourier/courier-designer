import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { createElement } from "react";
import { pendingLinkAtom, setPendingLinkAtom } from "@/components/ui/TextMenu/store";
import { linkTrackingEnabledAtom, setFormUpdating } from "@/components/TemplateEditor/store";
import { LinkBubble } from "./LinkBubble";

vi.mock("@/components/TemplateEditor/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/TemplateEditor/store")>();
  return { ...actual, setFormUpdating: vi.fn() };
});

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
    unsetColor: vi.fn().mockReturnThis(),
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

function renderWithStore(
  pendingLink: { mark?: any; link?: { from: number; to: number } } | null,
  opts?: { linkTrackingEnabled?: boolean }
) {
  const store = createStore();
  store.set(pendingLinkAtom, pendingLink);
  if (opts?.linkTrackingEnabled !== undefined) {
    store.set(linkTrackingEnabledAtom, opts.linkTrackingEnabled);
  }

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

    expect(windowOpen).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");

    windowOpen.mockRestore();
  });

  describe("Link colour", () => {
    const saveUrl = (url: string) => {
      const input = screen.getByPlaceholderText("Paste a link...");
      fireEvent.change(input, { target: { value: url } });
      fireEvent.keyDown(input, { key: "Enter" });
      return mockEditor.chain.mock.results.at(-1)?.value;
    };

    it("clears the inline text colour when creating a new link", () => {
      renderWithStore({ link: { from: 1, to: 5 } });
      const chain = saveUrl("https://test.com");

      // The link range gets its own textStyle run with no colour, so the link
      // renders in its default colour instead of inheriting the coloured run.
      expect(chain.unsetColor).toHaveBeenCalled();
      expect(chain.setLink).toHaveBeenCalledWith(
        expect.objectContaining({ href: "https://test.com" })
      );
    });

    it("keeps the colour when editing an existing link so a toolbar override sticks", () => {
      renderWithStore({
        link: { from: 1, to: 5 },
        mark: { attrs: { href: "https://example.com", target: null } },
      });
      const chain = saveUrl("https://updated.com");

      expect(chain.unsetColor).not.toHaveBeenCalled();
      expect(chain.setLink).toHaveBeenCalledWith(
        expect.objectContaining({ href: "https://updated.com" })
      );
    });

    it("does not touch the colour when only toggling tracking on an existing link", () => {
      renderWithStore({
        link: { from: 1, to: 5 },
        mark: { attrs: { href: "https://example.com", target: null } },
      });

      fireEvent.click(screen.getByRole("switch"));

      const chain = mockEditor.chain.mock.results.at(-1)?.value;
      expect(chain.unsetColor).not.toHaveBeenCalled();
    });
  });

  it("renders above the text toolbar's tippy layer", () => {
    const { container } = renderWithStore({ link: { from: 1, to: 5 } });
    // tippy sets z-index: 9999 on its own root, so the bubble must outrank it.
    expect(container.firstElementChild).toHaveClass("courier-z-[10000]");
  });

  describe("Link tracking toggle", () => {
    it("renders the Link tracking toggle when a link is present", () => {
      renderWithStore({ link: { from: 1, to: 5 } });
      expect(screen.getByText("Link tracking")).toBeInTheDocument();
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    it("shows tracking enabled (switch on) when disableTracking is absent", () => {
      renderWithStore({
        link: { from: 1, to: 5 },
        mark: { attrs: { href: "https://example.com", target: null } },
      });
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    });

    it("shows tracking disabled (switch off) when disableTracking is true", () => {
      renderWithStore({
        link: { from: 1, to: 5 },
        mark: { attrs: { href: "https://example.com", target: null, disableTracking: true } },
      });
      expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    });

    it("writes disable_tracking=true (inverted) onto the link when tracking is toggled off", () => {
      renderWithStore({
        link: { from: 1, to: 5 },
        mark: { attrs: { href: "https://example.com", target: null } },
      });

      fireEvent.click(screen.getByRole("switch")); // enabled -> disabled

      const chainResult = mockEditor.chain.mock.results.at(-1)?.value;
      expect(chainResult.setLink).toHaveBeenCalledWith(
        expect.objectContaining({ href: "https://example.com", disableTracking: true })
      );
    });

    it("regression: toggling does not close the bubble and uses the form-updating guard", () => {
      const { store } = renderWithStore({
        link: { from: 1, to: 5 },
        mark: { attrs: { href: "https://example.com", target: null } },
      });

      fireEvent.click(screen.getByRole("switch"));

      // pendingLink still holds the link range, so the bubble stays open.
      expect(store.get(pendingLinkAtom)?.link).toEqual({ from: 1, to: 5 });
      // onSelectionUpdate is suppressed for this form-initiated edit.
      expect(setFormUpdating).toHaveBeenCalledWith(true);
    });

    describe("when workspace click-through tracking is disabled", () => {
      it("renders the switch disabled and forced off even without disableTracking", () => {
        renderWithStore(
          {
            link: { from: 1, to: 5 },
            mark: { attrs: { href: "https://example.com", target: null } },
          },
          { linkTrackingEnabled: false }
        );
        const toggle = screen.getByRole("switch");
        expect(toggle).toBeDisabled();
        expect(toggle).toHaveAttribute("aria-checked", "false");
      });

      it("does not mutate the stored disableTracking attr when clicking the disabled switch", () => {
        renderWithStore(
          {
            link: { from: 1, to: 5 },
            mark: { attrs: { href: "https://example.com", target: null } },
          },
          { linkTrackingEnabled: false }
        );
        fireEvent.click(screen.getByRole("switch"));
        // Disabled switch never invokes the change handler / editor chain.
        expect(setFormUpdating).not.toHaveBeenCalled();
      });
    });

    it("behaves as before when workspace tracking is enabled", () => {
      renderWithStore(
        {
          link: { from: 1, to: 5 },
          mark: { attrs: { href: "https://example.com", target: null } },
        },
        { linkTrackingEnabled: true }
      );
      const toggle = screen.getByRole("switch");
      expect(toggle).not.toBeDisabled();
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });
  });
});
