// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFormGate } from "./use-form-gate";
import { useEditorDialog } from "./use-editor-dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { DiscardChangesDialog } from "@/components/admin/discard-changes-dialog";

afterEach(cleanup);

function Editor({ pending = false, onClose }: { pending?: boolean; onClose: () => void }) {
  const { formRef, formProps, isDirty, canSubmit } = useFormGate({ requireDirty: true });
  const { dialogRef, discardDialogRef, requestClose, confirmDiscard, keepEditing, discardChanges } =
    useEditorDialog({ isDirty, pending, onClose });
  return (
    <>
      <section ref={dialogRef} role="dialog" aria-label="Edit record">
        <form ref={formRef} {...formProps}>
          <label>
            Name
            <input name="name" defaultValue="Cocoa" required />
          </label>
          <CustomSelect
            label="Availability"
            name="availability"
            defaultValue="active"
            options={[
              { value: "active", label: "Active" },
              { value: "hidden", label: "Hidden" },
            ]}
          />
          <button type="button" onClick={requestClose}>
            Close
          </button>
          <button type="submit" disabled={pending || !canSubmit}>
            Save
          </button>
        </form>
      </section>
      {confirmDiscard && (
        <DiscardChangesDialog
          dialogRef={discardDialogRef}
          onKeepEditing={keepEditing}
          onDiscard={discardChanges}
        />
      )}
    </>
  );
}

describe("shared editor contracts", () => {
  it("requires a valid change and detects changes from CustomSelect", async () => {
    const user = userEvent.setup();
    render(<Editor onClose={vi.fn()} />);
    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await user.clear(screen.getByLabelText("Name"));
    expect(save.disabled).toBe(true);
    await user.type(screen.getByLabelText("Name"), "Cocoa");
    expect(save.disabled).toBe(true);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Hidden" }));
    await waitFor(() => expect(save.disabled).toBe(false));
  });

  it("keeps dirty edits on Escape and discards only after confirmation", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Editor onClose={onClose} />);
    await user.type(screen.getByLabelText("Name"), " updated");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Cocoa updated");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("blocks closing while pending", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Editor pending onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("restores focus and scrolling after a clean editor closes", async () => {
    const user = userEvent.setup();
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Edit</button>
          {open && <Editor onClose={() => setOpen(false)} />}
        </>
      );
    }
    const overflow = document.body.style.overflow;
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Edit" });
    await user.click(trigger);
    expect(document.body.style.overflow).toBe("hidden");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe(overflow);
  });
});
