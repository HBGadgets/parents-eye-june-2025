"use client";

import { useState } from "react";
import { CustomTable } from "@/components/ui/CustomTable";
import { useCategory } from "@/hooks/useCategory";
import { Button } from "@/components/ui/button";
import { Category } from "@/interface/modal";
import { getCategoryColumns } from "@/components/columns/columns";

export default function CategoryPage() {
  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCategory();

  const [categoryName, setCategoryName] = useState("");
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCreateModal = () => {
    setEditTarget(null);
    setCategoryName("");
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditTarget(category);
    setCategoryName(category.categoryName);
    setIsModalOpen(true);
  };

  const handleDelete = (row: Category) => {
    setDeleteTarget(row);
  };

  const columnsWithHandlers = getCategoryColumns(handleEdit, handleDelete);

  const handleSave = () => {
    if (!categoryName.trim()) return;

    if (editTarget) {
      console.log("updating category");
      updateCategory({ id: editTarget._id, payload: { categoryName } });
    } else {
      createCategory({ categoryName });
    }

    setIsModalOpen(false);
    setCategoryName("");
    setEditTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteCategory(deleteTarget._id);
    setDeleteTarget(null);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Categories</h2>
        <Button onClick={openCreateModal} className="bg-primary">
          Add Category
        </Button>
      </div>

      <CustomTable
        data={categories}
        columns={columnsWithHandlers}
        isLoading={isLoading}
        showSerialNumber
        maxHeight={450}
        noDataMessage="No categories added yet"
      />

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-4 rounded w-[340px] space-y-3">
            <h3 className="text-lg font-semibold">
              {editTarget ? "Edit Category" : "Add Category"}
            </h3>

            <input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Enter category name"
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

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-4 rounded w-[300px] space-y-3">
            <p>
              Delete category <b>{deleteTarget.categoryName}</b>?
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
