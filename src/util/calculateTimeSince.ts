// export const calculateTimeSince = (lastUpdateString: string): string => {
//   if (!lastUpdateString) return "00S";

//   const lastUpdate = new Date(lastUpdateString);
//   if (Number.isNaN(lastUpdate.getTime())) return "00S";

//   let diffInMs = Date.now() - lastUpdate.getTime();

//   // Do NOT do timezone math
//   // Just guard against bad future values
//   if (diffInMs < 0) diffInMs = 0;

//   const totalSeconds = Math.floor(diffInMs / 1000);

//   const days = Math.floor(totalSeconds / 86400);
//   const hours = Math.floor((totalSeconds % 86400) / 3600);
//   const minutes = Math.floor((totalSeconds % 3600) / 60);
//   const seconds = totalSeconds % 60;

//   if (days === 0 && hours === 0 && minutes === 0)
//     return `${seconds.toString().padStart(2, "0")}S`;

//   if (days === 0 && hours === 0)
//     return `${minutes.toString().padStart(2, "0")}M`;

//   if (days === 0)
//     return `${hours.toString().padStart(2, "0")}H ${minutes
//       .toString()
//       .padStart(2, "0")}M`;

//   return `${days.toString().padStart(2, "0")}D ${hours
//     .toString()
//     .padStart(2, "0")}H ${minutes.toString().padStart(2, "0")}M`;
// };

export const calculateTimeSince = (lastUpdateString: string): string => {
  if (!lastUpdateString) return "00S";

  // 👇 Z hata diya, ab IST treat hoga
  const cleaned = lastUpdateString.replace("Z", "");

  const lastUpdate = new Date(cleaned);
  if (Number.isNaN(lastUpdate.getTime())) return "00S";

  let diffInMs = Date.now() - lastUpdate.getTime();

  // agar thoda future aa bhi jaye to clamp
  if (diffInMs < 0) diffInMs = 0;

  const totalSeconds = Math.floor(diffInMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days === 0 && hours === 0 && minutes === 0)
    return `${seconds.toString().padStart(2, "0")}S`;

  if (days === 0 && hours === 0)
    return `${minutes.toString().padStart(2, "0")}M`;

  if (days === 0)
    return `${hours.toString().padStart(2, "0")}H ${minutes
      .toString()
      .padStart(2, "0")}M`;

  return `${days.toString().padStart(2, "0")}D ${hours
    .toString()
    .padStart(2, "0")}H ${minutes.toString().padStart(2, "0")}M`;
};
