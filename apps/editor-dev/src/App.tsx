import { Routes, Route } from "react-router-dom";
import "./style.css";
import "@trycourier/react-designer/styles.css";
import {
  Layout,
  BasicPage,
  CustomElementsPage,
  CustomHooksPage,
  ControlledValuePage,
  VariableValidationPage,
  VariableAutocompletePage,
  ShadowDomPage,
  LocalesTestPage,
} from "./pages";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<BasicPage />} />
        <Route path="custom-elements" element={<CustomElementsPage />} />
        <Route path="custom-hooks" element={<CustomHooksPage />} />
        <Route path="controlled-value" element={<ControlledValuePage />} />
        <Route path="variable-validation" element={<VariableValidationPage />} />
        <Route path="variable-autocomplete" element={<VariableAutocompletePage />} />
        <Route path="shadow-dom" element={<ShadowDomPage />} />
        <Route path="locales-test" element={<LocalesTestPage />} />
      </Route>
    </Routes>
  );
}

export default App;
