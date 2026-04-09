declare module 'react-simple-maps' {
  import { ComponentType, SVGProps, ReactNode, CSSProperties } from 'react';

  export interface ProjectionConfig {
    scale?: number;
    center?: [number, number];
    rotate?: [number, number, number];
    parallels?: [number, number];
  }

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: ProjectionConfig;
    width?: number;
    height?: number;
    style?: CSSProperties;
    className?: string;
    children?: ReactNode;
  }

  export interface GeographyFeature {
    rsmKey: string;
    properties: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: GeographyFeature[] }) => ReactNode;
  }

  export interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: GeographyFeature;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: CSSProperties & { outline?: string; cursor?: string; transition?: string };
      hover?: CSSProperties & { outline?: string };
      pressed?: CSSProperties & { outline?: string };
    };
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseMove?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    onClick?: (event: React.MouseEvent) => void;
    className?: string;
  }

  export interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
    className?: string;
  }

  export interface LineProps {
    from: [number, number];
    to: [number, number];
    stroke?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    strokeLinecap?: 'round' | 'square' | 'butt';
    strokeDasharray?: string;
    className?: string;
    style?: CSSProperties;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const Line: ComponentType<LineProps>;
  export const Sphere: ComponentType<SVGProps<SVGPathElement>>;
  export const Graticule: ComponentType<SVGProps<SVGPathElement>>;
  export const ZoomableGroup: ComponentType<{ center?: [number, number]; zoom?: number; children?: ReactNode }>;
}
