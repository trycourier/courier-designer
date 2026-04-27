import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { PrefixInput } from "./PrefixInput";

const URL_PREFIXES = [
  { label: "https://", value: "https://" },
  { label: "http://", value: "http://" },
];

describe("PrefixInput", () => {
  describe("rendering", () => {
    it("should render with default prefix and empty input", () => {
      render(<PrefixInput prefixOptions={URL_PREFIXES} defaultPrefix="https://" />);
      expect(screen.getByText("https://")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("should parse an https:// value into prefix and input", () => {
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="https://example.com"
        />
      );
      expect(screen.getByText("https://")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("example.com");
    });

    it("should parse an http:// value into prefix and input", () => {
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="http://example.com"
        />
      );
      expect(screen.getByText("http://")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("example.com");
    });

    it("should use default prefix when value has no recognized prefix", () => {
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="example.com"
        />
      );
      expect(screen.getByText("https://")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("example.com");
    });

    it("should show empty input when value is empty", () => {
      render(<PrefixInput prefixOptions={URL_PREFIXES} defaultPrefix="https://" value="" />);
      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("should render placeholder text", () => {
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          placeholder="example.com"
        />
      );
      expect(screen.getByPlaceholderText("example.com")).toBeInTheDocument();
    });

    it("should be disabled when disabled prop is true", () => {
      render(<PrefixInput prefixOptions={URL_PREFIXES} defaultPrefix="https://" disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });

  describe("typing behavior", () => {
    it("should emit full URL on plain text input", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          onChange={onChange}
        />
      );

      await user.type(screen.getByRole("textbox"), "google.com");
      expect(onChange).toHaveBeenLastCalledWith("https://google.com");
    });

    it("should strip protocol when user types a full URL with matching prefix", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      await user.type(input, "https://google.com");
      expect(input).toHaveValue("google.com");
      expect(onChange).toHaveBeenLastCalledWith("https://google.com");
    });

    it("should switch prefix and strip protocol when typing URL with different prefix", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      await user.type(input, "http://example.com");
      expect(input).toHaveValue("example.com");
      expect(onChange).toHaveBeenLastCalledWith("http://example.com");
    });

    it("should switch prefix to http:// when typing http:// before domain", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      await user.type(input, "http://");
      expect(input).toHaveValue("");
      expect(screen.getByRole("button")).toHaveTextContent("http://");
      expect(onChange).toHaveBeenLastCalledWith("http://");
    });

    it("should emit empty string when input is cleared", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="https://google.com"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      await user.clear(input);
      expect(onChange).toHaveBeenLastCalledWith("");
    });
  });

  describe("paste behavior", () => {
    it("should strip https:// when pasting URL with same prefix", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.paste("https://google.com");

      expect(input).toHaveValue("google.com");
      expect(onChange).toHaveBeenLastCalledWith("https://google.com");
    });

    it("should switch prefix when pasting URL with different prefix", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.paste("http://example.com");

      expect(input).toHaveValue("example.com");
      expect(onChange).toHaveBeenLastCalledWith("http://example.com");
    });

    it("should keep plain text as-is when pasting without protocol", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.paste("example.com/path");

      expect(input).toHaveValue("example.com/path");
      expect(onChange).toHaveBeenLastCalledWith("https://example.com/path");
    });

    it("should replace existing value when pasting full URL into non-empty input", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="https://old.com"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.paste("http://new.com");

      expect(input).toHaveValue("new.com");
      expect(onChange).toHaveBeenLastCalledWith("http://new.com");
    });
  });

  describe("prefix dropdown", () => {
    it("should switch prefix via dropdown and update stored value", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="https://example.com"
          onChange={onChange}
        />
      );

      const trigger = screen.getByRole("button");
      await user.click(trigger);

      const httpOption = await screen.findByText("http://", { selector: "[role='menuitem']" });
      await user.click(httpOption);

      expect(onChange).toHaveBeenLastCalledWith("http://example.com");
    });
  });

  describe("external value updates", () => {
    it("should re-derive prefix and input when value prop changes", () => {
      const { rerender } = render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="https://first.com"
        />
      );

      expect(screen.getByRole("textbox")).toHaveValue("first.com");
      expect(screen.getByText("https://")).toBeInTheDocument();

      rerender(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="http://second.com"
        />
      );

      expect(screen.getByRole("textbox")).toHaveValue("second.com");
      expect(screen.getByText("http://")).toBeInTheDocument();
    });
  });

  describe("legacy data (existing templates without protocol)", () => {
    it("should display www.google.com with https:// prefix when stored without protocol", () => {
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="www.google.com"
        />
      );
      expect(screen.getByText("https://")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("www.google.com");
    });

    it("should not emit onChange on initial render for legacy data", () => {
      const onChange = vi.fn();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="www.google.com"
          onChange={onChange}
        />
      );
      expect(onChange).not.toHaveBeenCalled();
    });

    it("should prepend https:// when user edits a legacy value without protocol", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="www.google.com"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      await user.type(input, "/path");
      expect(onChange).toHaveBeenLastCalledWith("https://www.google.com/path");
    });

    it("should preserve http:// prefix for existing http values", () => {
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="http://legacy-site.com"
        />
      );
      expect(screen.getByText("http://")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("legacy-site.com");
    });

    it("should keep http:// when user edits an existing http value", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="http://legacy-site.com"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      await user.type(input, "/page");
      expect(onChange).toHaveBeenLastCalledWith("http://legacy-site.com/page");
    });

    it("should handle bare domain without www", () => {
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="example.com"
        />
      );
      expect(screen.getByText("https://")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("example.com");
    });

    it("should handle domain with path but no protocol", () => {
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="example.com/some/path?q=1"
        />
      );
      expect(screen.getByText("https://")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("example.com/some/path?q=1");
    });

    it("should default to https:// and persist it when user saves a legacy value", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <PrefixInput
          prefixOptions={URL_PREFIXES}
          defaultPrefix="https://"
          value="www.google.com"
          onChange={onChange}
        />
      );

      const input = screen.getByRole("textbox");
      // Simulate user clicking into the field and pressing a key then undoing it
      // to trigger an onChange that persists the https:// prefix
      await user.click(input);
      await user.type(input, "x");
      expect(onChange).toHaveBeenLastCalledWith("https://www.google.comx");

      await user.type(input, "{backspace}");
      expect(onChange).toHaveBeenLastCalledWith("https://www.google.com");
    });
  });

  describe("ref forwarding", () => {
    it("should forward ref to the input element", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<PrefixInput ref={ref} prefixOptions={URL_PREFIXES} defaultPrefix="https://" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});
