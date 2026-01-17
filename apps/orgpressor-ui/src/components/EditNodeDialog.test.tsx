import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditNodeDialog } from "./EditNodeDialog";

describe("EditNodeDialog", () => {
  const defaultProps = {
    nodeName: "John Smith",
    metadata: {},
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it("displays the node name in the title", () => {
    render(<EditNodeDialog {...defaultProps} />);
    expect(screen.getByText("Edit: John Smith")).toBeInTheDocument();
  });

  it("shows empty input when metadata has no role", () => {
    render(<EditNodeDialog {...defaultProps} metadata={{}} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("shows current role in input", () => {
    render(<EditNodeDialog {...defaultProps} metadata={{ role: "CEO" }} />);
    expect(screen.getByRole("textbox")).toHaveValue("CEO");
  });

  it("calls onSave with updated metadata when Save is clicked", () => {
    const onSave = vi.fn();
    render(<EditNodeDialog {...defaultProps} onSave={onSave} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Manager" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith({ role: "Manager" });
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<EditNodeDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onSave when Enter is pressed in input", () => {
    const onSave = vi.fn();
    render(<EditNodeDialog {...defaultProps} onSave={onSave} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Developer" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSave).toHaveBeenCalledWith({ role: "Developer" });
  });

  it("calls onCancel when Escape is pressed in input", () => {
    const onCancel = vi.fn();
    render(<EditNodeDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });

    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when clicking the backdrop", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <EditNodeDialog {...defaultProps} onCancel={onCancel} />
    );

    // Click the backdrop (outermost div)
    fireEvent.click(container.firstChild as Element);

    expect(onCancel).toHaveBeenCalled();
  });

  it("does not call onCancel when clicking inside the dialog", () => {
    const onCancel = vi.fn();
    render(<EditNodeDialog {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByText("Edit: John Smith"));

    expect(onCancel).not.toHaveBeenCalled();
  });

  it("trims whitespace from role", () => {
    const onSave = vi.fn();
    render(<EditNodeDialog {...defaultProps} onSave={onSave} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  CEO  " } });
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith({ role: "CEO" });
  });

  it("sets role to undefined when input is empty", () => {
    const onSave = vi.fn();
    render(<EditNodeDialog {...defaultProps} metadata={{ role: "CEO" }} onSave={onSave} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith({ role: undefined });
  });

  it("sets role to undefined when input is only whitespace", () => {
    const onSave = vi.fn();
    render(<EditNodeDialog {...defaultProps} onSave={onSave} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith({ role: undefined });
  });

  it("preserves other metadata fields when saving", () => {
    const onSave = vi.fn();
    const metadata = { role: "CEO", otherField: "value" } as Record<string, unknown>;
    render(
      <EditNodeDialog {...defaultProps} metadata={metadata} onSave={onSave} />
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Manager" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledWith({ role: "Manager", otherField: "value" });
  });
});
