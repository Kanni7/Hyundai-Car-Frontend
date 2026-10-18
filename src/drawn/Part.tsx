import type { ReactNode, SVGProps } from 'react';

/**
 * A positioned SVG whose viewBox equals its own rectangle in cabin (photo-pixel)
 * coordinates. Children draw with global cabin coordinates, but each part is its
 * own element, so animating one part never repaints the rest of the cabin.
 */
export function Part({ x, y, w, h, className = '', children, ...rest }: {
  x: number; y: number; w: number; h: number; className?: string; children: ReactNode;
} & Omit<SVGProps<SVGSVGElement>, 'x' | 'y' | 'width' | 'height'>) {
  return (
    <svg className={`part ${className}`} style={{ left: x, top: y, width: w, height: h }}
      viewBox={`${x} ${y} ${w} ${h}`} {...rest}>
      {children}
    </svg>
  );
}
