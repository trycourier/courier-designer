import { Routes, Route } from "react-router-dom";
import "./style.css";
import "@trycourier/react-designer/styles.css";
import {
  Layout,
  Examples,
  Basic,
  ControlledValue,
  CustomElements,
  CustomHooks,
  Locales,
  PrefixValidation,
  ShadowDom,
  TranslationEditor,
  VariableAutocomplete,
  VariableValidation,
} from "./examples";

/**
 * Examples live under `/examples/<slug>`, one page per behaviour, catalogued on
 * `/examples` — the layout courier-web uses.
 *
 * `/` renders the basic editor rather than a landing page: it is the page
 * reached for when checking a change by hand, and the e2e suite navigates there
 * expecting an editor.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Basic />} />

        <Route path="examples" element={<Examples />} />

        {/* Editing */}
        <Route path="examples/basic" element={<Basic />} />
        <Route path="examples/controlled-value" element={<ControlledValue />} />
        <Route path="examples/custom-elements" element={<CustomElements />} />
        <Route path="examples/custom-hooks" element={<CustomHooks />} />

        {/* Variables */}
        <Route path="examples/variable-validation" element={<VariableValidation />} />
        <Route path="examples/variable-autocomplete" element={<VariableAutocomplete />} />
        <Route path="examples/prefix-validation" element={<PrefixValidation />} />

        {/* Localization */}
        <Route path="examples/locales" element={<Locales />} />
        <Route path="examples/translation-editor" element={<TranslationEditor />} />

        {/* Embedding */}
        <Route path="examples/shadow-dom" element={<ShadowDom />} />
      </Route>
    </Routes>
  );
}

export default App;
