# Component Patterns for MUTI_AI

## Standard Component
```tsx
import React from 'react';
import { clsx } from 'clsx';

interface Props {
  title: string;
  className?: string;
}

export const MeetingSection: React.FC<Props> = ({ title, className }) => {
  return (
    <div className={clsx('p-4 border rounded-lg', className)}>
      <h3 className="text-lg font-bold">{title}</h3>
    </div>
  );
};
```
