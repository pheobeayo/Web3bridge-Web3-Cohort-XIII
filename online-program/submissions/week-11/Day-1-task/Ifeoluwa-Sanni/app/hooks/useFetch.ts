import { useCallback, useState } from "react";

// Define proper types for the hook
type CallbackFunction<T = unknown> = (options?: Record<string, unknown>, ...args: unknown[]) => Promise<T>;
type UseFetchOptions = Record<string, unknown>;

export const useFetch = <T = unknown>(
  callbackFunction: CallbackFunction<T>, 
  options: UseFetchOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<string | Error | null>(null);

  const fn = useCallback(async (...args: unknown[]): Promise<T | false> => {
    setIsLoading(true);
    setIsError(null); // Reset error state
    try {
      const response = await callbackFunction(options, ...args);
      setData(response);
      return response;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
        setIsError(error);
      } else {
        console.error('Unknown error occurred');
        setIsError(new Error('Unknown error occurred'));
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [callbackFunction, options]);

  return { data, isLoading, isError, fn };
};