import type { FC, ReactNode } from 'react';

interface TabHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Consistent header for every admin tab. Keeps title row compact,
 * leaves room for action buttons on the right, and matches the admin shell density.
 */
const TabHeader: FC<TabHeaderProps> = ({ title, description, actions }) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
    <div className="min-w-0">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{title}</h2>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export default TabHeader;
