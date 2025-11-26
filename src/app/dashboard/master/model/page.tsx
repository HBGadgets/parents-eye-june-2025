"use client";

import { useState } from "react";
import { CustomTable } from "@/components/ui/CustomTable";
import { useModels } from "@/hooks/useModel";
import { getModelColumns } from "@/components/columns/columns";
import { Button } from "@/components/ui/button";

export default function ModelPage() {
  const { models, isLoading, createModel, updateModel, deleteModel } =
    useModels();

  const [modelName, setModelName] = useState("");
  const [editing, setEditing] = useState<any>(null);

  // CREATE / UPDATE
  const handleSave = () => {
    if (!modelName.trim()) return;

    if (editing) {
      updateModel({
        id: editing._id,
        payload: { modelName },
      });
    } else {
      createModel({ modelName });
    }

    setModelName("");
    setEditing(null);
  };

  const handleEdit = (model: any) => {
    setEditing(model);
    setModelName(model.modelName);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this model?")) {
      deleteModel(id);
    }
  };

  const columns = getModelColumns(handleEdit, handleDelete);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Models</h2>
        {/* <button className="bg-primary cursor-pointer">Add Model</button> */}
        <Button onClick={handleSave} className="bg-primary">
          {" "}
          Add Model
        </Button>
      </div>

      {/* Table */}
      <CustomTable
        data={models}
        columns={columns}
        isLoading={isLoading}
        showSerialNumber
        maxHeight={450}
        noDataMessage="No models added yet"
      />
    </div>
  );
}
