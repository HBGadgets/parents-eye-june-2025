"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomTable } from "@/components/ui/CustomTable";
import { useTicketType } from "@/hooks/useTicketType";
import CreateTicketForm from "./create-ticket-form";

export default function TicketTypesPage() {
  const { getTicketTypesQuery } = useTicketType();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: ticketTypes = [], isLoading } = getTicketTypesQuery;

  const columns = [
    { header: "Name", accessorKey: "name" },
  ]

  return (
    <div className="p-4">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-4">Ticket Types</h1>
          <p className="text-foreground/80">Manage your support ticket types here.</p>
        </div>
        <div>
          <Button 
            className="cursor-pointer"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Ticket
          </Button>
        </div>
      </section>

      <section className="mt-4">
        <CustomTable
          data={ticketTypes}
          isLoading={isLoading}
          columns={columns}
        />
      </section>

      <CreateTicketForm 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />

    </div>
  );
}
