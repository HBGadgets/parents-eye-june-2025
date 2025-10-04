export const calculateTimeSince = (lastUpdateString: string): string => {
  const lastUpdate = new Date(lastUpdateString);
  const now = new Date();
  const diffInMs = now.getTime() - lastUpdate.getTime();

  // Handle invalid dates or future dates
  if (isNaN(lastUpdate.getTime()) || diffInMs < 0) {
    return "00S";
  }

  const diffInSeconds = Math.floor(diffInMs / 1000);

  // Calculate days, hours, minutes, and seconds
  const days = Math.floor(diffInSeconds / (24 * 60 * 60));
  const remainingAfterDays = diffInSeconds % (24 * 60 * 60);

  const hours = Math.floor(remainingAfterDays / (60 * 60));
  const remainingAfterHours = remainingAfterDays % (60 * 60);

  const minutes = Math.floor(remainingAfterHours / 60);
  const seconds = remainingAfterHours % 60;

  // Format with leading zeros
  const formattedDays = days.toString().padStart(2, "0");
  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  // Conditional formatting based on values
  if (days === 0 && hours === 0 && minutes === 0) {
    // Only show seconds when days, hours, and minutes are all 0
    return `${formattedSeconds}S`;
  } else if (days === 0 && hours === 0) {
    // Only show minutes when days and hours are 0
    return `${formattedMinutes}M`;
  } else if (days === 0) {
    // Show hours and minutes when days are 0
    return `${formattedHours}H ${formattedMinutes}M`;
  } else {
    // Show full format when days are not 0
    return `${formattedDays}D ${formattedHours}H ${formattedMinutes}M`;
  }
};
