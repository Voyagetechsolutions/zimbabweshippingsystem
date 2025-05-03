
import React, { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, 
  title, 
  description, 
  action 
}) => {
  return (
    <div className="text-center py-10 bg-gray-50 rounded-lg">
      <div className="mx-auto mb-3">{icon}</div>
      <h3 className="text-lg font-medium text-gray-500 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
