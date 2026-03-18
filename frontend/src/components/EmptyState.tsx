import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  return (
    <div className="text-center py-12 px-4">
      {icon && (
        <div className="text-6xl mb-4">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 max-w-md mx-auto">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
