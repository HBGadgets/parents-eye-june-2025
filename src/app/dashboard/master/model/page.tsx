"use client";

import { useState } from "react";
import { CustomTable } from "@/components/ui/CustomTable";
import { useModels } from "@/hooks/useModel";
import { getModelColumns } from "@/components/columns/columns";
import { Button } from "@/components/ui/button";
import { Model } from "@/interface/modal";

export default function ModelPage() {
  const {
    models,
    isLoading,
    createModel,
    updateModel,
    deleteModel,
    isCreating,
    isUpdating,
    isDeleting,
  } = useModels();

  const [modelName, setModelName] = useState("");
  const [editTarget, setEditTarget] = useState<Model | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Open modal for Add
  const openCreateModal = () => {
    setEditTarget(null);
    setModelName("");
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleEdit = (model: Model) => {
    setEditTarget(model);
    setModelName(model.modelName);
    setIsModalOpen(true);
  };

  const handleDelete = (row: Model) => {
    setDeleteTarget(row);
  };

  // Inject handlers into columns
  const columnWithHandlers = getModelColumns(handleEdit, handleDelete);

  // Save (Create/Update)
  const handleSave = () => {
    if (!modelName.trim()) return;

    if (editTarget) {
      updateModel({ id: editTarget._id, payload: { modelName } });
    } else {
      createModel({ modelName });
    }

    setIsModalOpen(false);
    setModelName("");
    setEditTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteModel(deleteTarget._id);
    setDeleteTarget(null);
  };

  return (
    <div className="p-4 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Models</h2>
        <Button onClick={openCreateModal} className="bg-primary">
          Add Model
        </Button>
      </div>

      {/* TABLE */}
      <CustomTable
        data={models}
        columns={columnWithHandlers}
        isLoading={isLoading}
        showSerialNumber
        maxHeight={450}
        noDataMessage="No models added yet"
      />

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-4 rounded w-[340px] space-y-3">
            <h3 className="text-lg font-semibold">
              {editTarget ? "Edit Model" : "Add Model"}
            </h3>

            <input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Enter model name"
              className="border rounded px-3 py-2 w-full"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>

              <Button
                onClick={handleSave}
                disabled={isCreating || isUpdating}
                className="bg-primary"
              >
                {editTarget
                  ? isUpdating
                    ? "Updating..."
                    : "Update"
                  : isCreating
                  ? "Adding..."
                  : "Add"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-4 rounded w-[300px] space-y-3">
            <p>
              Delete model <b>{deleteTarget.modelName}</b>?
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
