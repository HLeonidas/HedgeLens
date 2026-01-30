"use client";

import type { ReactNode } from "react";

type MobileNavProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function MobileNav({ isOpen, onClose, children }: MobileNavProps) {
  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={onClose}
        ></div>
      ) : null}
      <div
        className={[
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85%] transform transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-64 lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </>
  );
}