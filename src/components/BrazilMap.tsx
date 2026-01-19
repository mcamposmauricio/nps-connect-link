import { useMemo } from "react";

interface StateData {
  state: string;
  npsScore: number;
  totalResponses: number;
}

interface BrazilMapProps {
  data: StateData[];
  onStateClick?: (state: string) => void;
  onStateHover?: (state: string | null) => void;
  hoveredState?: string | null;
}

// NPS Score to color mapping
const getNPSColor = (score: number | null): string => {
  if (score === null) return "hsl(var(--muted))";
  if (score >= 70) return "hsl(142, 76%, 36%)"; // Green - High NPS
  if (score >= 30) return "hsl(142, 76%, 56%)"; // Light Green - Medium-High
  if (score >= 0) return "hsl(48, 96%, 53%)"; // Yellow - Neutral
  if (score >= -30) return "hsl(25, 95%, 53%)"; // Orange - Low
  return "hsl(0, 84%, 60%)"; // Red - Very Low
};

// Brazilian state paths (simplified SVG paths)
const BRAZIL_STATES: Record<string, { path: string; center: { x: number; y: number } }> = {
  AC: { path: "M85,280 L115,275 L125,290 L110,305 L80,300 Z", center: { x: 100, y: 288 } },
  AL: { path: "M520,290 L545,285 L550,300 L535,310 L515,305 Z", center: { x: 532, y: 298 } },
  AP: { path: "M295,95 L335,85 L345,120 L320,140 L290,130 Z", center: { x: 315, y: 112 } },
  AM: { path: "M130,145 L230,135 L260,180 L245,240 L180,255 L120,230 L100,180 Z", center: { x: 175, y: 190 } },
  BA: { path: "M420,260 L500,245 L530,290 L510,350 L450,365 L400,340 L390,290 Z", center: { x: 455, y: 305 } },
  CE: { path: "M485,200 L530,185 L545,220 L525,250 L490,260 L475,235 Z", center: { x: 510, y: 222 } },
  DF: { path: "M375,335 L395,330 L400,345 L385,355 L370,350 Z", center: { x: 385, y: 343 } },
  ES: { path: "M490,365 L520,355 L530,385 L510,400 L485,395 Z", center: { x: 507, y: 378 } },
  GO: { path: "M340,305 L400,290 L420,340 L395,380 L350,385 L325,345 Z", center: { x: 368, y: 340 } },
  MA: { path: "M375,180 L440,160 L460,205 L445,245 L395,260 L365,220 Z", center: { x: 412, y: 210 } },
  MT: { path: "M245,255 L330,240 L360,300 L340,370 L270,385 L230,340 L220,290 Z", center: { x: 285, y: 310 } },
  MS: { path: "M275,390 L340,375 L355,430 L320,470 L265,465 L250,420 Z", center: { x: 305, y: 425 } },
  MG: { path: "M380,340 L470,320 L495,365 L480,410 L420,430 L370,415 L360,375 Z", center: { x: 425, y: 375 } },
  PA: { path: "M260,130 L360,115 L395,175 L370,235 L305,250 L250,235 L230,180 Z", center: { x: 305, y: 180 } },
  PB: { path: "M505,255 L545,250 L555,270 L535,280 L500,280 Z", center: { x: 527, y: 265 } },
  PR: { path: "M330,430 L395,415 L420,445 L405,480 L345,490 L315,465 Z", center: { x: 365, y: 455 } },
  PE: { path: "M475,260 L545,250 L555,280 L520,300 L470,295 Z", center: { x: 512, y: 275 } },
  PI: { path: "M420,205 L470,195 L485,250 L455,280 L415,275 L400,240 Z", center: { x: 445, y: 240 } },
  RJ: { path: "M465,410 L505,400 L525,420 L505,440 L460,435 Z", center: { x: 490, y: 420 } },
  RN: { path: "M510,225 L555,215 L565,240 L545,255 L510,255 Z", center: { x: 535, y: 238 } },
  RS: { path: "M320,495 L395,480 L420,530 L385,575 L320,575 L295,540 Z", center: { x: 360, y: 530 } },
  RO: { path: "M170,260 L240,250 L260,300 L235,340 L175,345 L145,305 Z", center: { x: 200, y: 298 } },
  RR: { path: "M195,75 L245,60 L270,105 L250,145 L200,150 L175,110 Z", center: { x: 220, y: 105 } },
  SC: { path: "M360,485 L410,475 L430,510 L410,535 L360,540 L345,510 Z", center: { x: 385, y: 507 } },
  SP: { path: "M365,415 L450,400 L475,435 L455,475 L385,485 L355,455 Z", center: { x: 415, y: 445 } },
  SE: { path: "M520,305 L550,300 L555,325 L535,335 L515,325 Z", center: { x: 535, y: 318 } },
  TO: { path: "M370,235 L420,220 L445,275 L425,330 L385,340 L360,295 Z", center: { x: 400, y: 280 } },
};

// Full state names
const STATE_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export function BrazilMap({ data, onStateClick, onStateHover, hoveredState }: BrazilMapProps) {
  const stateDataMap = useMemo(() => {
    const map: Record<string, StateData> = {};
    data.forEach((d) => {
      map[d.state] = d;
    });
    return map;
  }, [data]);

  return (
    <svg
      viewBox="50 50 550 550"
      className="w-full h-full"
      style={{ maxHeight: "400px" }}
    >
      {/* Background */}
      <rect x="50" y="50" width="550" height="550" fill="transparent" />
      
      {/* States */}
      {Object.entries(BRAZIL_STATES).map(([stateCode, { path }]) => {
        const stateData = stateDataMap[stateCode];
        const npsScore = stateData?.npsScore ?? null;
        const color = getNPSColor(npsScore);
        const isHovered = hoveredState === stateCode;
        
        return (
          <g key={stateCode}>
            <path
              d={path}
              fill={color}
              stroke={isHovered ? "hsl(var(--primary))" : "hsl(var(--border))"}
              strokeWidth={isHovered ? 2.5 : 1}
              className="transition-all duration-200 cursor-pointer"
              style={{
                transform: isHovered ? "scale(1.02)" : "scale(1)",
                transformOrigin: "center",
                filter: isHovered ? "brightness(1.1)" : "none",
              }}
              onMouseEnter={() => onStateHover?.(stateCode)}
              onMouseLeave={() => onStateHover?.(null)}
              onClick={() => onStateClick?.(stateCode)}
            />
            <text
              x={BRAZIL_STATES[stateCode].center.x}
              y={BRAZIL_STATES[stateCode].center.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="bold"
              fill="hsl(var(--foreground))"
              className="pointer-events-none select-none"
              style={{ textShadow: "0 0 3px hsl(var(--background))" }}
            >
              {stateCode}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export { STATE_NAMES, getNPSColor };
