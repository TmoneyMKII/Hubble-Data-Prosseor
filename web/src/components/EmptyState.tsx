import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: string;
  title: string;
  children: ReactNode;
  chip?: string;
};

export function EmptyState({ icon, title, children, chip }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{children}</p>
      {chip && <span className="empty__chip">{chip}</span>}
    </div>
  );
}
