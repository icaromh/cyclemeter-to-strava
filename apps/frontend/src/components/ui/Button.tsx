import type { ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";
import "./button.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={clsx("button", `button-${variant}`, className)} {...props} />;
}

