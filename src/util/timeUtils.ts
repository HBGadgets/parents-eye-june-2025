/**
 * Time parsing and formatting utilities
 */

export interface ParseTimeOptions {
  baseDate?: Date;
  fallbackTime?: Date;
  strict?: boolean;
}

export interface TimeParseResult {
  success: boolean;
  date?: Date;
  error?: string;
}

/**
 * Parses a time string in various formats and returns a Date object
 *
 * @param timeStr - Time string to parse (e.g., "05:05 pm", "17:30", "5:30 AM")
 * @param options - Configuration options
 * @returns Parsed Date object or throws error in strict mode
 *
 * @example
 * ```
 * // Basic usage
 * const time1 = parseTimeString("05:05 pm");
 * const time2 = parseTimeString("17:30");
 *
 * // With custom base date
 * const time3 = parseTimeString("2:30 PM", {
 *   baseDate: new Date("2025-12-25")
 * });
 *
 * // With fallback
 * const time4 = parseTimeString("invalid", {
 *   fallbackTime: new Date()
 * });
 * ```
 */
export const parseTimeString = (
  timeStr: string,
  options: ParseTimeOptions = {}
): Date => {
  const {
    baseDate = new Date(),
    fallbackTime = new Date(),
    strict = false,
  } = options;

  if (!timeStr || typeof timeStr !== "string") {
    if (strict) {
      throw new Error("Invalid time string provided");
    }
    return fallbackTime;
  }

  try {
    const trimmedTime = timeStr.trim().toLowerCase();

    // Check if it's already a valid Date string
    if (
      trimmedTime.includes("gmt") ||
      trimmedTime.includes("t") ||
      trimmedTime.includes("z")
    ) {
      const parsedDate = new Date(timeStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    // Handle AM/PM format (e.g., "05:05 pm", "2:30 AM")
    if (trimmedTime.includes("am") || trimmedTime.includes("pm")) {
      const [time, period] = trimmedTime.split(/\s+/);
      const [hoursStr, minutesStr = "0"] = time.split(":");

      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 1 ||
        hours > 12 ||
        minutes < 0 ||
        minutes > 59
      ) {
        throw new Error(`Invalid time format: ${timeStr}`);
      }

      let hour24 = hours;
      if (period === "pm" && hours !== 12) {
        hour24 = hours + 12;
      } else if (period === "am" && hours === 12) {
        hour24 = 0;
      }

      return new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate(),
        hour24,
        minutes,
        0,
        0
      );
    }

    // Handle 24-hour format (e.g., "17:30", "09:15")
    if (trimmedTime.includes(":")) {
      const [hoursStr, minutesStr = "0", secondsStr = "0"] =
        trimmedTime.split(":");

      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      const seconds = parseInt(secondsStr, 10);

      if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        throw new Error(`Invalid time format: ${timeStr}`);
      }

      return new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate(),
        hours,
        minutes,
        isNaN(seconds) ? 0 : seconds,
        0
      );
    }

    throw new Error(`Unsupported time format: ${timeStr}`);
  } catch (error) {
    if (strict) {
      throw error;
    }
    console.warn(`Failed to parse time string "${timeStr}":`, error);
    return fallbackTime;
  }
};

/**
 * Safe version of parseTimeString that returns a result object instead of throwing
 */
export const safeParseTimeString = (
  timeStr: string,
  options: ParseTimeOptions = {}
): TimeParseResult => {
  try {
    const date = parseTimeString(timeStr, { ...options, strict: true });
    return { success: true, date };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Formats a Date object back to a readable time string
 */
export const formatTimeToString = (
  date: Date,
  format: "12h" | "24h" = "12h"
): string => {
  if (!date || isNaN(date.getTime())) {
    return "";
  }

  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: format === "12h",
  };

  return date.toLocaleTimeString([], options);
};

/**
 * Validates if a time string can be parsed
 */
export const isValidTimeString = (timeStr: string): boolean => {
  const result = safeParseTimeString(timeStr);
  return result.success;
};
