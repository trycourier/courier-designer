import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhatsappAuthenticationLayout } from "./WhatsappAuthentication";

describe("WhatsappAuthenticationLayout", () => {
  it("draws WhatsApp's message for the defaults: security sentence on, no expiry", () => {
    render(<WhatsappAuthenticationLayout settings={{}} />);
    const message = screen.getByTestId("whatsapp-authentication-message");

    expect(message.textContent).toContain("data.code is your verification code.");
    expect(message.querySelector(".courier-variable-chip")?.textContent).toBe("data.code");
    expect(message.textContent).toContain("For your security, do not share this code.");
    expect(message.textContent).not.toContain("Expires in");
    expect(message.textContent).toContain("Copy code");
  });

  it("draws the expiry footer and leaves out a turned-off security sentence", () => {
    render(
      <WhatsappAuthenticationLayout
        settings={{ securityRecommendation: false, codeExpirationMinutes: 1 }}
      />
    );
    const message = screen.getByTestId("whatsapp-authentication-message");

    expect(message.textContent).not.toContain("For your security");
    expect(message.textContent).toContain("Expires in 1 minute.");
  });

  it("turns the expiry on at 10 minutes and reports only values WhatsApp accepts", () => {
    const onChange = vi.fn();
    const { rerender } = render(<WhatsappAuthenticationLayout settings={{}} onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch", { name: "Code expiry footer" }));
    expect(onChange).toHaveBeenLastCalledWith({ codeExpirationMinutes: 10 });

    rerender(
      <WhatsappAuthenticationLayout settings={{ codeExpirationMinutes: 10 }} onChange={onChange} />
    );
    onChange.mockClear();
    const input = screen.getByLabelText("Code expiry in minutes");

    fireEvent.change(input, { target: { value: "91" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("A whole number from 1 to 90.")).toBeTruthy();

    fireEvent.change(input, { target: { value: "90" } });
    expect(onChange).toHaveBeenLastCalledWith({ codeExpirationMinutes: 90 });
  });

  it("removes the lifetime when turned off", () => {
    const onChange = vi.fn();
    render(
      <WhatsappAuthenticationLayout
        settings={{ securityRecommendation: true, messageSendTtlSeconds: 60 }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole("switch", { name: "Message lifetime" }));
    expect(onChange).toHaveBeenLastCalledWith({ securityRecommendation: true });
  });

  it("shows no options while read-only", () => {
    render(<WhatsappAuthenticationLayout settings={{}} readOnly />);

    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getByTestId("whatsapp-authentication-message")).toBeTruthy();
  });
});
