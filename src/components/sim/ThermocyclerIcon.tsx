import type { SVGProps } from "react";

/** Termociclador de sobremesa: tapa calefactada, cuerpo inclinado y pantalla frontal (rejilla Lucide 24×24). */
export function ThermocyclerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 4h12l1 4H5z" />
      <path d="M5 8 3 19a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1L19 8" />
      <rect x="7" y="11" width="7" height="5" rx="0.5" />
      <path d="M17 12v.01M17 15v.01" />
    </svg>
  );
}
