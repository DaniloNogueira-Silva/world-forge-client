import "./App.css";
import { WorldCanvas } from "./components/canvas/WorldCanvas";
import { CreateNodeModal } from "./components/CreateNodeModal";
import { Toolbar } from "./components/ToolBar";

function App() {
  return (
    <main>
      <Toolbar />
      <WorldCanvas />
      <CreateNodeModal />
    </main>
  );
}

export default App;
