export function convertToISOString(dateString) {
    // Create a Date object from the input date string
    // Note: The date will be interpreted in the local timezone
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    
    // Convert to ISO string (automatically converts to UTC)
    return date.toISOString();
  }