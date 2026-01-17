import { OrgGraph } from "orgpressor-ui";
import type { PersonNode, HierarchyEdge } from "orgpressor-ui";

const sampleNodes: PersonNode[] = [
  { id: "1", label: "Alice Chen" },
  { id: "2", label: "Bob Smith" },
  { id: "3", label: "Carol Johnson" },
  { id: "4", label: "David Lee" },
  { id: "5", label: "Emma Wilson" },
  { id: "6", label: "Frank Brown" },
];

const sampleEdges: HierarchyEdge[] = [
  { from: "1", to: "2" },
  { from: "1", to: "3" },
  { from: "2", to: "4" },
  { from: "2", to: "5" },
];

function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#f5f5f5",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px" }}>Organization Chart Demo</h1>
        <p style={{ margin: "8px 0 0", color: "#666" }}>
          Testing orgpressor-ui as an external package dependency
        </p>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside
          style={{
            width: "250px",
            padding: "16px",
            borderRight: "1px solid #e0e0e0",
            backgroundColor: "#fafafa",
          }}
        >
          <h2 style={{ fontSize: "16px", marginTop: 0 }}>Instructions</h2>
          <ul style={{ paddingLeft: "20px", lineHeight: 1.6 }}>
            <li>Drag nodes to reorganize</li>
            <li>Pull down to detach from parent</li>
            <li>Drop on another node to attach</li>
            <li>Drop in top bar to make root</li>
            <li>Double-click to edit metadata</li>
          </ul>

          <h2 style={{ fontSize: "16px" }}>Sample Data</h2>
          <p style={{ fontSize: "14px", color: "#666" }}>
            {sampleNodes.length} nodes, {sampleEdges.length} edges
          </p>
          <p style={{ fontSize: "14px", color: "#666" }}>
            Frank Brown starts as a free node (no connections)
          </p>
        </aside>

        <main style={{ flex: 1, position: "relative" }}>
          <OrgGraph nodes={sampleNodes} edges={sampleEdges} />
        </main>
      </div>

      <footer
        style={{
          padding: "12px 24px",
          borderTop: "1px solid #e0e0e0",
          backgroundColor: "#f5f5f5",
          fontSize: "14px",
          color: "#666",
        }}
      >
        Powered by orgpressor-ui v0.0.1
      </footer>
    </div>
  );
}

export default App;
