'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FluidStepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
  isSubmitting?: boolean;
}

export function FluidStepper({ steps, currentStep, className, isSubmitting = false }: FluidStepperProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [animatedProgress, setAnimatedProgress] = useState(((currentStep - 1) / (steps.length - 1)) * 100);

  // Update animated progress smoothly when currentStep changes
  useEffect(() => {
    const targetProgress = ((currentStep - 1) / (steps.length - 1)) * 100;

    // If submitting, animate to 100%
    if (isSubmitting) {
      setAnimatedProgress(100);
      return;
    }

    // Animate progress change
    let startTime: number;
    const duration = 500; // ms
    const startProgress = animatedProgress;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic function for smooth animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const newProgress = startProgress + (targetProgress - startProgress) * easeProgress;

      setAnimatedProgress(newProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [currentStep, steps.length, isSubmitting]);

  return (
    <div className={cn("relative mb-10", className)}>
      {/* Step indicators */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isActive = index + 1 <= currentStep;
          const isCompleted = index + 1 < currentStep;
          const isCurrentStep = index + 1 === currentStep;

          return (
            <div key={index} className="flex flex-col items-center relative z-10">
              {/* Step number circle */}
              <motion.div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg border-2 font-bold text-sm mb-2 relative z-10",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted bg-muted text-muted-foreground"
                )}
                initial={false}
                animate={{
                  borderColor: isActive ? "hsl(var(--primary))" : "hsl(var(--muted))",
                  backgroundColor: isActive ? "hsl(var(--primary))" : "hsl(var(--muted))",
                }}
                transition={{
                  duration: 1,
                  ease: "easeInOut"
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Show checkmark for completed steps */}
                {isCompleted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}

                {/* Subtle pulse for current step */}
                {isCurrentStep && !isSubmitting && (
                  <motion.span
                    className="absolute inset-0 rounded-lg border-2 bg-primary border-primary"
                    initial={{ opacity: 0.7, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.2 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                )}

                {/* Loading animation when submitting */}
                {isSubmitting && index + 1 === steps.length && (
                  <motion.span
                    className="absolute inset-0 rounded-lg border-2 border-primary"
                    initial={{ opacity: 0.7, scale: 1, rotate: 0 }}
                    animate={{ opacity: 0.5, scale: 1.1, rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                )}
              </motion.div>

              {/* Step label */}
              <span className={cn(
                "text-xs font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fluid progress bar */}
      <div className="absolute top-5 left-0 right-0 h-1 transform -translate-y-1/2 z-0">
        {/* Background track */}
        <div className="absolute inset-0 bg-muted rounded-full" />

        {/* Fluid progress */}
        <motion.div
          ref={progressRef}
          className="relative h-full overflow-hidden rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${animatedProgress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Animated fluid */}
          <div className="absolute inset-0 fluid-progress-improved" />

          {/* Bubbles effect - improved to be more subtle */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="fluid-bubble-improved absolute w-1 h-1 bg-primary/50 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
