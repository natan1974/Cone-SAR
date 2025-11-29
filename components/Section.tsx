import React, { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ title, children, icon, className }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6 ${className}`}>
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        {icon && <span className="text-primary-600">{icon}</span>}
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="p-4 md:p-6">
        {children}
      </div>
    </div>
  );
};
