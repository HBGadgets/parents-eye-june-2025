import api from "@/lib/axios";
import { TicketType } from "@/interface/modal";

export const getTicketTypes = async (): Promise<TicketType[]> => {
  const res = await api.get("/get-ticket-types");
  return res.data;
};

export const createTicketType = async (payload: {
  name: string;
  description: string;
}) => {
  const res = await api.post("/add-ticket-type", payload);
  return res.data;
};
