import { useState, useMemo, useCallback, useRef } from "react";
import { OrgGraph } from "orgpressor-ui";
import type { PersonNode, HierarchyEdge, GraphAccessor } from "orgpressor-ui";
import { generateGraphData } from "./utils/generateGraphData";

const defaultNodes: PersonNode[] = [
  { id: "1", label: "Alice Chen" },
  { id: "2", label: "Bob Smith" },
  { id: "3", label: "Carol Johnson" },
  { id: "4", label: "David Lee" },
  { id: "5", label: "Emma Wilson" },
  { id: "6", label: "Frank Brown" },
];

const defaultEdges: HierarchyEdge[] = [
  { from: "1", to: "2" },
  { from: "1", to: "3" },
  { from: "2", to: "4" },
  { from: "2", to: "5" },
];

const inputStyle: React.CSSProperties = {
  width: "60px",
  padding: "4px 8px",
  border: "1px solid #ccc",
  borderRadius: "4px",
  fontSize: "14px",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "#1976d2",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#666",
};

function App() {
  const [numDags, setNumDags] = useState(1);
  const [nodesPerDag, setNodesPerDag] = useState(7);
  const [numFreeNodes, setNumFreeNodes] = useState(5);
  const [seed, setSeed] = useState(() => Date.now());
  const [useDefault, setUseDefault] = useState(true);
  const [canvasPos, setCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const graphAccessorRef = useRef<GraphAccessor | null>(null);

  const handleReady = useCallback((accessor: GraphAccessor) => {
    graphAccessorRef.current = accessor;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!graphAccessorRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const domPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const canvas = graphAccessorRef.current.domToCanvas(domPos);
    setCanvasPos({ x: Math.round(canvas.x), y: Math.round(canvas.y) });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCanvasPos(null);
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (useDefault) {
      return { nodes: defaultNodes, edges: defaultEdges };
    }
    return generateGraphData({ numDags, nodesPerDag, numFreeNodes, seed });
  }, [useDefault, numDags, nodesPerDag, numFreeNodes, seed]);

  const handleGenerate = () => {
    setUseDefault(false);
    setSeed(Date.now());
  };

  const handleReset = () => {
    setUseDefault(true);
  };

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
            overflowY: "auto",
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

          <h2 style={{ fontSize: "16px" }}>Data Generator</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: "14px" }}>DAGs:</label>
              <input
                type="number"
                min={1}
                max={50}
                value={numDags}
                onChange={(e) => setNumDags(Math.max(1, parseInt(e.target.value) || 1))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: "14px" }}>Nodes per DAG:</label>
              <input
                type="number"
                min={1}
                max={100}
                value={nodesPerDag}
                onChange={(e) => setNodesPerDag(Math.max(1, parseInt(e.target.value) || 1))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: "14px" }}>Free nodes:</label>
              <input
                type="number"
                min={0}
                max={100}
                value={numFreeNodes}
                onChange={(e) => setNumFreeNodes(Math.max(0, parseInt(e.target.value) || 0))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button onClick={handleGenerate} style={buttonStyle}>
                Generate
              </button>
              <button onClick={handleReset} style={secondaryButtonStyle}>
                Reset
              </button>
            </div>
          </div>

          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #ddd" }}>
            <h2 style={{ fontSize: "16px", marginTop: 0 }}>Current Data</h2>
            <p style={{ fontSize: "14px", color: "#666", margin: "8px 0" }}>
              {useDefault ? "Using default sample data" : "Using generated data"}
            </p>
            <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
              {nodes.length} nodes, {edges.length} edges
            </p>
          </div>

          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #ddd" }}>
            <h2 style={{ fontSize: "16px", marginTop: 0 }}>Mouse Position</h2>
            <p style={{ fontSize: "14px", color: "#666", margin: 0, fontFamily: "monospace" }}>
              {canvasPos ? `X: ${canvasPos.x}, Y: ${canvasPos.y}` : "Hover over graph"}
            </p>
          </div>
        </aside>

        <main
          style={{ flex: 1, position: "relative" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <OrgGraph key={seed} nodes={nodes} edges={edges} onReady={handleReady} />
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
