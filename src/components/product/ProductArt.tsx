import { useId } from "react";
import type { ArtKind } from "@/data/products";

type Props = {
  kind: ArtKind;
  className?: string;
};

/**
 * Vector product illustrations used until real product photos are uploaded.
 * Every drawing sits in a 200×200 box with its base near y=180.
 */
export function ProductArt({ kind, className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={id("steel")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f2ef" />
          <stop offset="0.5" stopColor="#cfcbc5" />
          <stop offset="1" stopColor="#a9a49d" />
        </linearGradient>
        <linearGradient id={id("cream")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#efe4d4" />
          <stop offset="0.55" stopColor="#f8f1e6" />
          <stop offset="1" stopColor="#d9cab4" />
        </linearGradient>
        <linearGradient id={id("dark")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a4a4f" />
          <stop offset="0.5" stopColor="#26262a" />
          <stop offset="1" stopColor="#141416" />
        </linearGradient>
        <linearGradient id={id("glass")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5d6875" />
          <stop offset="0.5" stopColor="#1d2228" />
          <stop offset="1" stopColor="#3a444f" />
        </linearGradient>
        <linearGradient id={id("white")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dedbd6" />
        </linearGradient>
        <linearGradient id={id("copper")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9c08a" />
          <stop offset="1" stopColor="#a8703a" />
        </linearGradient>
        <linearGradient id={id("purple")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a58bd6" />
          <stop offset="1" stopColor="#5b3fa0" />
        </linearGradient>
        <linearGradient id={id("screen")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0b47a" />
          <stop offset="0.45" stopColor="#b0648f" />
          <stop offset="1" stopColor="#2c3a78" />
        </linearGradient>
        <radialGradient id={id("shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="184" rx="70" ry="7" fill={url("shadow")} />

      {kind === "coffee" && (
        <g>
          <rect x="48" y="38" width="104" height="144" rx="12" fill={url("dark")} />
          <rect x="48" y="38" width="104" height="40" rx="12" fill={url("steel")} />
          <rect x="48" y="66" width="104" height="12" fill={url("steel")} />
          <rect x="62" y="48" width="44" height="18" rx="4" fill="#15161a" />
          <rect x="67" y="54" width="20" height="2.5" rx="1.25" fill="#7fd6c2" />
          <rect x="67" y="59" width="12" height="2.5" rx="1.25" fill="#4d5560" />
          <circle cx="126" cy="57" r="8" fill="#2a2b30" stroke="#f4f2ef" strokeWidth="1.5" />
          <circle cx="126" cy="57" r="2.5" fill={url("copper")} />
          <rect x="62" y="90" width="76" height="62" rx="8" fill="#0d0d0f" />
          <rect x="88" y="90" width="24" height="16" rx="3" fill={url("steel")} />
          <rect x="93" y="106" width="4" height="6" rx="1" fill="#8d8983" />
          <rect x="103" y="106" width="4" height="6" rx="1" fill="#8d8983" />
          <path d="M84 126h32l-3 24a4 4 0 0 1-4 3H91a4 4 0 0 1-4-3z" fill={url("white")} />
          <path d="M116 131h5a6 6 0 0 1 0 12h-6" fill="none" stroke="#e8e5e0" strokeWidth="3" />
          <ellipse cx="100" cy="127" rx="15" ry="2.5" fill="#6b4226" />
          <rect x="56" y="158" width="88" height="8" rx="3" fill={url("steel")} />
          <rect x="52" y="174" width="96" height="8" rx="3" fill="#0d0d0f" />
        </g>
      )}

      {kind === "vacuum" && (
        <g>
          <rect x="102" y="52" width="7" height="112" rx="3.5" transform="rotate(20 105 108)" fill={url("purple")} />
          <rect x="103.5" y="52" width="2" height="112" rx="1" transform="rotate(20 105 108)" fill="#fff" opacity="0.35" />
          <g transform="rotate(20 128 44)">
            <rect x="106" y="20" width="50" height="26" rx="13" fill={url("steel")} />
            <rect x="110" y="26" width="26" height="14" rx="7" fill={url("glass")} />
            <circle cx="148" cy="33" r="7" fill={url("copper")} />
            <rect x="124" y="44" width="14" height="30" rx="5" fill={url("dark")} />
            <rect x="118" y="70" width="26" height="12" rx="4" fill="#3a3a3f" />
          </g>
          <path d="M42 166h62a6 6 0 0 1 6 6v8H36v-8a6 6 0 0 1 6-6z" fill={url("dark")} />
          <rect x="36" y="174" width="74" height="6" rx="3" fill={url("purple")} />
          <circle cx="78" cy="166" r="6" fill="#3a3a3f" />
          <circle cx="150" cy="160" r="20" fill={url("dark")} />
          <circle cx="150" cy="160" r="12" fill={url("purple")} />
          <circle cx="150" cy="160" r="5" fill="#1b1b1e" />
        </g>
      )}

      {kind === "robot" && (
        <g>
          <ellipse cx="100" cy="124" rx="74" ry="44" fill="#bdb9b3" />
          <ellipse cx="100" cy="116" rx="74" ry="44" fill={url("white")} />
          <ellipse cx="100" cy="116" rx="74" ry="44" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.8" />
          <ellipse cx="100" cy="110" rx="26" ry="15" fill="#c9c5bf" />
          <ellipse cx="100" cy="106" rx="26" ry="15" fill={url("steel")} />
          <ellipse cx="100" cy="106" rx="15" ry="8.5" fill={url("glass")} />
          <ellipse cx="100" cy="140" rx="9" ry="4.5" fill="#e9e6e1" stroke="#c9c5bf" />
          <circle cx="100" cy="140" r="1.8" fill="#7fd6c2" />
          <path d="M40 128c16 14 40 21 60 21s44-7 60-21" fill="none" stroke="#c9c5bf" strokeWidth="1.5" />
        </g>
      )}

      {kind === "blender" && (
        <g>
          <path d="M70 30h60l-6 86H76z" fill="#dfe6ea" opacity="0.55" />
          <path d="M70 30h60l-6 86H76z" fill="none" stroke="#9aa5ad" strokeWidth="2" />
          <path d="M74 70h52l-3 46H77z" fill={url("copper")} opacity="0.55" />
          <path d="M84 36l-3 70" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <rect x="66" y="22" width="68" height="12" rx="5" fill={url("dark")} />
          <rect x="90" y="14" width="20" height="10" rx="4" fill="#3a3a3f" />
          <path d="M130 48h12a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8h-14" fill="none" stroke="#2a2a2e" strokeWidth="6" strokeLinecap="round" />
          <path d="M72 116h56l8 58a8 8 0 0 1-8 8H72a8 8 0 0 1-8-8z" fill={url("dark")} />
          <circle cx="100" cy="150" r="13" fill="#17171a" stroke="#5a5a60" strokeWidth="2" />
          <rect x="98.5" y="140" width="3" height="9" rx="1.5" fill={url("copper")} />
          <rect x="72" y="116" width="56" height="6" fill={url("steel")} />
        </g>
      )}

      {kind === "airfryer" && (
        <g>
          <path d="M52 62c0-22 16-36 48-36s48 14 48 36v104a16 16 0 0 1-16 16H68a16 16 0 0 1-16-16z" fill={url("dark")} />
          <path d="M60 60c0-16 14-26 40-26" fill="none" stroke="#fff" strokeWidth="2" opacity="0.18" strokeLinecap="round" />
          <rect x="74" y="46" width="52" height="34" rx="8" fill="#0c0c0e" />
          <text x="100" y="69" textAnchor="middle" fontSize="15" fontWeight="600" fill="#7fd6c2" fontFamily="inherit">180°</text>
          <rect x="58" y="96" width="84" height="74" rx="10" fill="#1b1b1e" stroke="#3d3d42" strokeWidth="1.5" />
          <rect x="82" y="122" width="36" height="14" rx="7" fill={url("steel")} />
          <rect x="58" y="96" width="84" height="5" rx="2.5" fill="#3d3d42" />
        </g>
      )}

      {kind === "fridge" && (
        <g>
          <rect x="52" y="14" width="96" height="168" rx="12" fill={url("cream")} />
          <rect x="52" y="14" width="96" height="168" rx="12" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.7" />
          <rect x="52" y="78" width="96" height="2.5" fill="#bfae95" />
          <rect x="62" y="38" width="5" height="30" rx="2.5" fill={url("steel")} />
          <rect x="62" y="90" width="5" height="44" rx="2.5" fill={url("steel")} />
          <rect x="112" y="26" width="24" height="12" rx="3" fill="#2a2520" />
          <rect x="116" y="31" width="10" height="2" rx="1" fill="#7fd6c2" />
          <path d="M132 20v156" stroke="#fff" strokeWidth="5" opacity="0.28" strokeLinecap="round" />
          <rect x="58" y="180" width="14" height="4" rx="2" fill="#8b7c66" />
          <rect x="128" y="180" width="14" height="4" rx="2" fill="#8b7c66" />
        </g>
      )}

      {kind === "washer" && (
        <g>
          <rect x="36" y="30" width="128" height="152" rx="12" fill={url("white")} />
          <rect x="36" y="30" width="128" height="152" rx="12" fill="none" stroke="#c9c5bf" strokeWidth="1.5" />
          <rect x="36" y="60" width="128" height="1.5" fill="#cfcbc5" />
          <rect x="48" y="40" width="34" height="12" rx="3" fill="#e4e1dc" />
          <rect x="94" y="39" width="36" height="14" rx="4" fill="#17181c" />
          <rect x="99" y="45" width="16" height="2.5" rx="1.25" fill="#7fd6c2" />
          <circle cx="146" cy="46" r="8" fill={url("steel")} stroke="#aaa59e" />
          <rect x="145" y="39" width="2" height="6" rx="1" fill="#6e6a64" />
          <circle cx="100" cy="120" r="46" fill={url("steel")} />
          <circle cx="100" cy="120" r="37" fill={url("glass")} />
          <circle cx="100" cy="120" r="26" fill="#12161b" />
          <path d="M78 104a28 28 0 0 1 30-10" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
          <path d="M76 128c8-6 16 6 24 0s16 6 24 0v6a24 24 0 0 1-48 0z" fill="#6aa7d8" opacity="0.45" />
        </g>
      )}

      {kind === "tv" && (
        <g>
          <rect x="16" y="42" width="168" height="104" rx="7" fill="#101012" />
          <rect x="20" y="46" width="160" height="96" rx="4" fill={url("screen")} />
          <circle cx="132" cy="84" r="16" fill="#ffdcae" opacity="0.85" />
          <path d="M20 128l38-34 28 22 30-38 64 52v8a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" fill="#181b3d" opacity="0.7" />
          <path d="M24 48h70L24 110z" fill="#fff" opacity="0.08" />
          <path d="M72 180l14-34h28l14 34z" fill="none" stroke="#2c2c30" strokeWidth="4" strokeLinejoin="round" />
          <rect x="62" y="178" width="76" height="4" rx="2" fill="#2c2c30" />
        </g>
      )}

      {kind === "ac" && (
        <g>
          <rect x="14" y="52" width="172" height="62" rx="16" fill={url("white")} />
          <rect x="14" y="52" width="172" height="62" rx="16" fill="none" stroke="#cfcbc5" strokeWidth="1.5" />
          <path d="M22 96h156" stroke="#cfcbc5" strokeWidth="1.5" />
          <rect x="30" y="100" width="140" height="7" rx="3.5" fill="#b8b3ac" />
          <rect x="146" y="66" width="24" height="10" rx="3" fill="#17181c" />
          <text x="158" y="74" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#7fd6c2" fontFamily="inherit">22°</text>
          <path d="M26 62h100" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <g fill="none" stroke="#8ec5e8" strokeWidth="3" strokeLinecap="round" opacity="0.8">
            <path d="M58 126c-6 8 6 12 0 22s6 12 0 20" />
            <path d="M100 126c-6 8 6 12 0 22s6 12 0 20" />
            <path d="M142 126c-6 8 6 12 0 22s6 12 0 20" />
          </g>
        </g>
      )}

      {kind === "oven" && (
        <g>
          <rect x="30" y="28" width="140" height="154" rx="10" fill={url("dark")} />
          <rect x="30" y="28" width="140" height="34" rx="10" fill={url("steel")} />
          <rect x="30" y="52" width="140" height="10" fill={url("steel")} />
          <circle cx="52" cy="45" r="7" fill="#2a2a2e" />
          <circle cx="148" cy="45" r="7" fill="#2a2a2e" />
          <rect x="51" y="39" width="2" height="6" rx="1" fill="#f4f2ef" />
          <rect x="147" y="39" width="2" height="6" rx="1" fill="#f4f2ef" />
          <rect x="78" y="37" width="44" height="16" rx="4" fill="#111215" />
          <text x="100" y="49" textAnchor="middle" fontSize="9" fontWeight="600" fill="#f0b47a" fontFamily="inherit">200°</text>
          <rect x="42" y="74" width="116" height="8" rx="4" fill={url("steel")} />
          <rect x="42" y="92" width="116" height="78" rx="8" fill="#0b0b0d" />
          <rect x="48" y="98" width="104" height="66" rx="5" fill="#2a1a10" />
          <rect x="48" y="98" width="104" height="66" rx="5" fill={url("copper")} opacity="0.3" />
          <path d="M54 132h92M54 148h92" stroke="#8d8983" strokeWidth="1.5" />
          <path d="M52 100h56l-56 46z" fill="#fff" opacity="0.07" />
        </g>
      )}

      {kind === "purifier" && (
        <g>
          <rect x="58" y="24" width="84" height="158" rx="24" fill={url("white")} />
          <rect x="58" y="24" width="84" height="158" rx="24" fill="none" stroke="#cfcbc5" strokeWidth="1.5" />
          <circle cx="100" cy="52" r="13" fill="#eeebe6" stroke="#cfcbc5" />
          <circle cx="100" cy="52" r="5" fill="#7fd6c2" />
          <g fill="#c2bdb6">
            {[96, 108, 120, 132, 144, 156].map((y) =>
              [76, 88, 100, 112, 124].map((x) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" />
              )),
            )}
          </g>
          <path d="M70 40v120" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        </g>
      )}

      {kind === "microwave" && (
        <g>
          <rect x="18" y="58" width="164" height="110" rx="12" fill={url("steel")} />
          <rect x="28" y="68" width="108" height="90" rx="8" fill="#0d0d0f" />
          <rect x="34" y="74" width="96" height="78" rx="5" fill={url("glass")} />
          <path d="M36 76h46l-46 42z" fill="#fff" opacity="0.1" />
          <rect x="144" y="70" width="30" height="16" rx="4" fill="#111215" />
          <text x="159" y="82" textAnchor="middle" fontSize="9" fontWeight="600" fill="#7fd6c2" fontFamily="inherit">1:30</text>
          <circle cx="159" cy="110" r="10" fill="#f4f2ef" stroke="#aaa59e" />
          <rect x="158" y="102" width="2" height="7" rx="1" fill="#6e6a64" />
          <circle cx="159" cy="142" r="10" fill="#f4f2ef" stroke="#aaa59e" />
          <rect x="30" y="168" width="16" height="6" rx="2" fill="#6e6a64" />
          <rect x="154" y="168" width="16" height="6" rx="2" fill="#6e6a64" />
        </g>
      )}
    </svg>
  );
}
