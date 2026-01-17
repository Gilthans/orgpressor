import { useState, useEffect, useCallback } from "react";
import type { NodeMetadata } from "../types";

interface EditNodeDialogProps {
  nodeName: string;
  metadata: NodeMetadata;
  onSave: (metadata: NodeMetadata) => void;
  onCancel: () => void;
}

export function EditNodeDialog({
  nodeName,
  metadata,
  onSave,
  onCancel,
}: EditNodeDialogProps) {
  const [role, setRole] = useState(metadata.role || "");

  useEffect(() => {
    setRole(metadata.role || "");
  }, [metadata]);

  const handleSave = useCallback(() => {
    onSave({ ...metadata, role: role.trim() || undefined });
  }, [metadata, role, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        onCancel();
      }
    },
    [handleSave, onCancel]
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 8,
          padding: 24,
          minWidth: 300,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>
          Edit: {nodeName}
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="role-input"
            style={{ display: "block", marginBottom: 4, fontWeight: 500 }}
          >
            Role
          </label>
          <input
            id="role-input"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., CEO, Manager, Developer"
            autoFocus
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 14,
              border: "1px solid #ccc",
              borderRadius: 4,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              border: "1px solid #ccc",
              borderRadius: 4,
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              border: "none",
              borderRadius: 4,
              backgroundColor: "#1976d2",
              color: "white",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
