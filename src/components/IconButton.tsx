import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = {
  label: string;
  icon: ReactNode;
  variant?: "ghost" | "danger" | "accent";
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function IconButton({
  label,
  icon,
  variant = "ghost",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  const classes = ["icon-button", `icon-button--${variant}`];
  if (className) {
    classes.push(className);
  }

  return (
    <button
      type={type}
      className={classes.join(" ")}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
}
