/**
 * Live Region for Screen Readers
 * Announces dynamic content changes to screen reader users
 */
export const LiveRegion = () => {
  return (
    <div
      id="sr-live-region"
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    />
  );
};
