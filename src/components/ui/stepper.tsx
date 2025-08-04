"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface StepperProps {
  children: React.ReactNode;
  activeStep: number;
  className?: string;
}

interface StepProps {
  children: React.ReactNode;
  className?: string;
}

interface StepLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function Stepper({ children, activeStep, className }: StepperProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      {React.Children.map(children, (child, index) => (
        <React.Fragment key={index}>
          {React.cloneElement(child as React.ReactElement<StepProps>, {
            className: cn(
              "flex-1",
              index < React.Children.count(children) - 1 && "pr-8"
            ),
          })}
          {index < React.Children.count(children) - 1 && (
            <div className="h-1 flex-1 bg-border mx-[-1rem]" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function Step({ children, className }: StepProps) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {children}
    </div>
  );
}

export function StepLabel({ children, className }: StepLabelProps) {
  return (
    <div className={cn("text-sm font-medium text-muted-foreground", className)}>
      {children}
    </div>
  );
}
