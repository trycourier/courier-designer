// Ensure needed variables are defined in the window scope to prevent minification errors
(function safeInitGlobals() {
  if (typeof window !== 'undefined') {
    // This creates a non-enumerable property that won't be removed during tree-shaking
    // but will still initialize needed variables
    Object.defineProperty(window, '__courier_initialized', {
      value: true,
      enumerable: false
    });
  }
})();

import "./styles.css";

export * from "./components/CourierEditor";
export * from "./components/CourierTemplateProvider";
