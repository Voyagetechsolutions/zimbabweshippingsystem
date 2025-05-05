
/**
 * Utility function to safely cast database data to a defined type
 * 
 * @param data The data from the database query
 * @param transformer Optional function to transform the data
 * @returns Data cast to the specified type
 */
export function castDatabaseData<T>(data: any, transformer?: (data: any) => T): T {
  if (transformer) {
    return transformer(data);
  }
  return data as T;
}

/**
 * Helper function to cast an array of database records to a specified type
 * 
 * @param data Array of data from the database
 * @param transformer Optional function to transform each item
 * @returns Array cast to the specified type
 */
export function castDatabaseArray<T>(data: any[], transformer?: (item: any) => T): T[] {
  if (!Array.isArray(data)) {
    return [];
  }
  
  if (transformer) {
    return data.map(item => transformer(item));
  }
  
  return data as T[];
}

/**
 * Type guard to check if a value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type assertion function to ensure a value is of a certain type
 * Throws an error if the assertion fails
 */
export function assertType<T>(value: any, check: (val: any) => boolean, errorMessage: string): T {
  if (!check(value)) {
    throw new Error(errorMessage);
  }
  return value as T;
}
