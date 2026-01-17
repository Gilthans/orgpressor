import { OrgGraph } from "./components/OrgGraph";
import nodesData from "./data/nodes.json";
import type { PersonNode, HierarchyEdge } from "./types";

const nodes: PersonNode[] = nodesData;

// Sample hierarchy for testing
const edges: HierarchyEdge[] = [
  { from: "1", to: "2" },
  { from: "1", to: "3" },
  { from: "2", to: "4" },
  { from: "2", to: "5" },
  { from: "3", to: "6" },
  { from: "3", to: "7" },
];

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <OrgGraph nodes={nodes} edges={edges} />
    </div>
  );
}

export default App;
