import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl xl:text-3xl font-bold flex items-center gap-2">
            {Icon && <Icon className="h-6 w-6 xl:h-7 xl:w-7" />}
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="w-full xl:w-auto flex flex-col xl:flex-row gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
