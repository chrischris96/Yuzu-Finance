// components/ui/Button.tsx
import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link";
}

const baseStyles =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2";

const variantStyles: Record<string, string> = {
  default: "bg-blue-600 text-white hover:bg-blue-700",
  outline: "border border-gray-300 text-gray-800 hover:bg-gray-100",
  ghost: "bg-transparent hover:bg-gray-100",
  link: "bg-transparent underline text-blue-600 hover:text-blue-800"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    return (
      <button
        className={`${baseStyles} ${variantStyles[variant] || ""} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export default Button;
