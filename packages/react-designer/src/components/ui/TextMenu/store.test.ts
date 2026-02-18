import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import { variablesEnabledAtom } from "@/components/TemplateEditor/store";
import { getNodeConfigAtom, textInputStateAtom } from "./store";

describe("getNodeConfigAtom", () => {
  describe("variable button visibility based on variablesEnabledAtom", () => {
    it("should show variable button when variablesEnabled is true (default)", () => {
      const store = createStore();
      // variablesEnabledAtom defaults to true
      const getNodeConfig = store.get(getNodeConfigAtom);
      const config = getNodeConfig("paragraph");

      expect(config.variable?.state).toBe("enabled");
    });

    it("should hide variable button when variablesEnabled is false", () => {
      const store = createStore();
      store.set(variablesEnabledAtom, false);

      const getNodeConfig = store.get(getNodeConfigAtom);
      const config = getNodeConfig("paragraph");

      expect(config.variable?.state).toBe("hidden");
    });

    it("should hide variable button for heading nodes when variablesEnabled is false", () => {
      const store = createStore();
      store.set(variablesEnabledAtom, false);

      const getNodeConfig = store.get(getNodeConfigAtom);
      const config = getNodeConfig("heading");

      expect(config.variable?.state).toBe("hidden");
    });

    it("should hide variable button for list nodes when variablesEnabled is false", () => {
      const store = createStore();
      store.set(variablesEnabledAtom, false);

      const getNodeConfig = store.get(getNodeConfigAtom);
      const config = getNodeConfig("list");

      expect(config.variable?.state).toBe("hidden");
    });

    it("should hide variable button with text selection when variablesEnabled is false", () => {
      const store = createStore();
      store.set(variablesEnabledAtom, false);

      const getNodeConfig = store.get(getNodeConfigAtom);
      const config = getNodeConfig("paragraph", true);

      expect(config.variable?.state).toBe("hidden");
    });

    it("should show variable button with text selection when variablesEnabled is true", () => {
      const store = createStore();
      // variablesEnabledAtom defaults to true
      const getNodeConfig = store.get(getNodeConfigAtom);
      const config = getNodeConfig("paragraph", true);

      expect(config.variable?.state).toBe("enabled");
    });

    it("should override TextInput variable override when variablesEnabled is false", () => {
      const store = createStore();
      // Simulate TextInput focus with variables
      store.set(textInputStateAtom, {
        isFocused: true,
        hasVariables: true,
        showVariablePopup: false,
      });
      store.set(variablesEnabledAtom, false);

      const getNodeConfig = store.get(getNodeConfigAtom);
      // Even for nodes where variable is normally hidden (e.g. button),
      // TextInput focus would override to enabled — but variablesEnabled=false wins
      const config = getNodeConfig("button");

      expect(config.variable?.state).toBe("hidden");
    });

    it("should allow TextInput variable override when variablesEnabled is true", () => {
      const store = createStore();
      store.set(textInputStateAtom, {
        isFocused: true,
        hasVariables: true,
        showVariablePopup: false,
      });
      // variablesEnabledAtom defaults to true

      const getNodeConfig = store.get(getNodeConfigAtom);
      const config = getNodeConfig("button");

      expect(config.variable?.state).toBe("enabled");
    });

    it("should reactively update when variablesEnabled changes", () => {
      const store = createStore();

      // Initially enabled
      let getNodeConfig = store.get(getNodeConfigAtom);
      let config = getNodeConfig("paragraph");
      expect(config.variable?.state).toBe("enabled");

      // Disable
      store.set(variablesEnabledAtom, false);
      getNodeConfig = store.get(getNodeConfigAtom);
      config = getNodeConfig("paragraph");
      expect(config.variable?.state).toBe("hidden");

      // Re-enable
      store.set(variablesEnabledAtom, true);
      getNodeConfig = store.get(getNodeConfigAtom);
      config = getNodeConfig("paragraph");
      expect(config.variable?.state).toBe("enabled");
    });

    it("should not affect other toolbar buttons when variables are disabled", () => {
      const store = createStore();
      store.set(variablesEnabledAtom, false);

      const getNodeConfig = store.get(getNodeConfigAtom);
      const config = getNodeConfig("paragraph", true);

      // Variable is hidden
      expect(config.variable?.state).toBe("hidden");
      // Other buttons remain unaffected
      expect(config.bold?.state).toBe("enabled");
      expect(config.italic?.state).toBe("enabled");
      expect(config.link?.state).toBe("enabled");
    });
  });
});
