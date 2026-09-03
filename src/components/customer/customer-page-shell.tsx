import type { ReactNode } from "react";
import { CustomerFooter } from "@/components/customer/customer-footer";
import { CustomerHeader } from "@/components/customer/customer-header";

interface CustomerPageShellProps {
  children: ReactNode;
  activePath?: string;
}

export function CustomerPageShell({ children, activePath }: CustomerPageShellProps) {
  return (
    <>
      <CustomerHeader activePath={activePath} />
      <main id="main-content" className="customer-photo-background" tabIndex={-1}>{children}</main>
      <CustomerFooter
        address="University of Caloocan City - Congressional Campus"
        supportEmail="tsokolitaw@gmail.com"
      />
    </>
  );
}
