import api from "@/lib/axios";
import { TimelineResponse } from "@/interface/modal";

export const timelineService = {
  getTimeline: async (
    params: Record<string, any>
  ): Promise<TimelineResponse> => {
    const res = await api.get<TimelineResponse>("/dashboard/timeline", {
      params,
    });
    return res.data;
  },
};
