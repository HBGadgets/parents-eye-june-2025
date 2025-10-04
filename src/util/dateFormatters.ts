export const formatToIST = (dateString: string): string => {
  const utcDate = new Date(dateString);
  const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
  const day = istDate.getUTCDate().toString().padStart(2, "0");
  const month = (istDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = istDate.getUTCFullYear();
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes().toString().padStart(2, "0");
  const seconds = istDate.getUTCSeconds().toString().padStart(2, "0");
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";

  return `${day}/${month}/${year}, ${hour12}:${minutes}:${seconds} ${ampm}`;
};

export const getStatusInfo = (status: string) => {
  const statusMap: Record<string, { text: string; color: string }> = {
    running: { text: "Running", color: "#28a745" },
    idle: { text: "Idle", color: "#ffc107" },
    stopped: { text: "Stopped", color: "#dc3545" },
    inactive: { text: "Inactive", color: "#666666" },
    overspeeding: { text: "Overspeeding", color: "#fd7e14" },
    noData: { text: "No Data", color: "#007bff" },
  };
  return statusMap[status] || statusMap.noData;
};
