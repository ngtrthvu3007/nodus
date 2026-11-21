"use client";

import { Alert, Button } from "antd";

type LoadErrorProps = {
  title: string;
  onRetry: () => void;
  className?: string;
};

export const LoadError = ({ title, onRetry, className }: LoadErrorProps) => {
  const retryButton = (
    <Button size="small" onClick={onRetry}>
      Try again
    </Button>
  );

  return <Alert type="error" showIcon title={title} action={retryButton} className={className} />;
};
