"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
  {
    variants: {
      variant: {
        default: "!bg-gradient-to-r !from-white !to-gray-100 hover:!from-gray-100 hover:!to-gray-200 !text-gray-700 !border !border-gray-300 shadow-lg !font-semibold",
        destructive:
          "!bg-gradient-to-r !from-white !to-gray-100 hover:!from-red-50 hover:!to-red-100 !text-red-700 !border !border-red-300 shadow-lg !font-semibold",
        outline:
          "!border-2 !border-gray-400 !text-gray-700 !bg-white hover:!bg-gray-100 hover:!border-gray-500 !font-semibold",
        secondary:
          "!bg-gradient-to-r !from-gray-200 !to-gray-300 !text-gray-800 hover:!from-gray-300 hover:!to-gray-400 shadow-md !font-semibold",
        ghost: "hover:!bg-gray-100 hover:!text-gray-800 !text-gray-600 !font-semibold",
        link: "!text-gray-700 underline-offset-4 hover:underline !font-semibold",
        audio: "!bg-gradient-to-r !from-white !to-gray-100 !text-gray-700 hover:!from-gray-100 hover:!to-gray-200 shadow-lg !border !border-gray-300 !font-semibold",
        gradient: "!bg-gradient-to-r !from-white !to-gray-100 !text-gray-700 hover:!from-gray-100 hover:!to-gray-200 shadow-lg !border !border-gray-300 !font-semibold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };