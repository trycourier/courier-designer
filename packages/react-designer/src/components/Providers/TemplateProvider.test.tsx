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

  it("should throw error when useTemplateStore is used outside provider", () => {
    const TestComponent = () => {
      // This should throw
      useTemplateStore();
      return <div>Should not render</div>;
    };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useTemplateStore must be used within a TemplateProvider");

    console.error = originalError;
  });

  it("should provide store and overrideFunctions in context", () => {
    const TestComponent = () => {
      const { store, overrideFunctions } = useTemplateStore();
      return (
        <div>
          <div data-testid="has-store">{store ? "yes" : "no"}</div>
          <div data-testid="has-overrides">{overrideFunctions ? "yes" : "no"}</div>
        </div>
      );
    };

    render(
      <TemplateProvider templateId="test" tenantId="tenant" token="token">
        <TestComponent />
      </TemplateProvider>
    );

    expect(screen.getByTestId("has-store")).toHaveTextContent("yes");
    expect(screen.getByTestId("has-overrides")).toHaveTextContent("yes");
  });

  it("should handle custom override functions", () => {
    const customGetTemplate = async () => {
      console.log("Custom getTemplate called");
    };

    const customSaveTemplate = async () => {
      console.log("Custom saveTemplate called");
    };

    const TestComponent = () => {
      const { overrideFunctions } = useTemplateStore();
      return (
        <div>
          <div data-testid="get-override">
            {overrideFunctions.getTemplate ? "yes" : "no"}
          </div>
          <div data-testid="save-override">
            {overrideFunctions.saveTemplate ? "yes" : "no"}
          </div>
        </div>
      );
    };

    render(
      <TemplateProvider
        templateId="test"
        tenantId="tenant"
        token="token"
        getTemplate={customGetTemplate}
        saveTemplate={customSaveTemplate}
      >
        <TestComponent />
      </TemplateProvider>
    );

    expect(screen.getByTestId("get-override")).toHaveTextContent("yes");
    expect(screen.getByTestId("save-override")).toHaveTextContent("yes");
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
