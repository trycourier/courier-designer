import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TemplateProvider, useTemplateStore } from "./TemplateProvider";
import { useAtom } from "jotai";
import { templateIdAtom } from "./store";

describe("TemplateProvider", () => {
  it("should create isolated stores for multiple instances", () => {
    const TestComponent = ({ label }: { label: string }) => {
      // Access store to verify context works (even if we don't use it directly)
      useTemplateStore();
      const [templateId] = useAtom(templateIdAtom);
      return (
        <div data-testid={`editor-${label}`}>
          TemplateId: {templateId || "none"}
        </div>
      );
    };

    // Render two separate TemplateProvider instances
    render(
      <div>
        <TemplateProvider templateId="template-1" tenantId="tenant-1" token="token-1">
          <TestComponent label="1" />
        </TemplateProvider>
        <TemplateProvider templateId="template-2" tenantId="tenant-2" token="token-2">
          <TestComponent label="2" />
        </TemplateProvider>
      </div>
    );

    // Both editors should be rendered
    expect(screen.getByTestId("editor-1")).toBeInTheDocument();
    expect(screen.getByTestId("editor-2")).toBeInTheDocument();

    // Each should have its own template ID
    expect(screen.getByTestId("editor-1")).toHaveTextContent("template-1");
    expect(screen.getByTestId("editor-2")).toHaveTextContent("template-2");
  });

  it("should allow useTemplateStore to work outside provider (uses default Jotai store)", () => {
    const TestComponent = () => {
      const { store } = useTemplateStore();
      return <div data-testid="store-exists">{store ? "yes" : "no"}</div>;
    };

    render(<TestComponent />);

    // Jotai's useStore returns the default global store when used outside a Provider
    expect(screen.getByTestId("store-exists")).toHaveTextContent("yes");
  });

  it("should provide store in context", () => {
    const TestComponent = () => {
      const { store } = useTemplateStore();
      return (
        <div>
          <div data-testid="has-store">{store ? "yes" : "no"}</div>
        </div>
      );
    };

    render(
      <TemplateProvider templateId="test" tenantId="tenant" token="token">
        <TestComponent />
      </TemplateProvider>
    );

    expect(screen.getByTestId("has-store")).toHaveTextContent("yes");
  });

  it("should handle custom uploadImage function", () => {
    const customUploadImage = async () => {
      return { url: "https://example.com/image.png" };
    };

    const TestComponent = () => {
      const { store } = useTemplateStore();
      return (
        <div>
          <div data-testid="has-store">{store ? "yes" : "no"}</div>
        </div>
      );
    };

    render(
      <TemplateProvider
        templateId="test"
        tenantId="tenant"
        token="token"
        uploadImage={customUploadImage}
      >
        <TestComponent />
      </TemplateProvider>
    );

    expect(screen.getByTestId("has-store")).toHaveTextContent("yes");
  });

  it("should create unique stores for each instance", () => {
    const storeRefs: any[] = [];

    const TestComponent = ({ index }: { index: number }) => {
      const { store } = useTemplateStore();
      // Capture store reference on first render
      if (storeRefs.length === index) {
        storeRefs.push(store);
      }
      return <div data-testid={`component-${index}`}>Component {index}</div>;
    };

    render(
      <div>
        <TemplateProvider templateId="template-1" tenantId="tenant-1" token="token-1">
          <TestComponent index={0} />
        </TemplateProvider>
        <TemplateProvider templateId="template-2" tenantId="tenant-2" token="token-2">
          <TestComponent index={1} />
        </TemplateProvider>
      </div>
    );

    // Verify both components rendered
    expect(screen.getByTestId("component-0")).toBeInTheDocument();
    expect(screen.getByTestId("component-1")).toBeInTheDocument();

    // Verify stores are different objects
    expect(storeRefs.length).toBe(2);
    expect(storeRefs[0]).not.toBe(storeRefs[1]);
  });
});
