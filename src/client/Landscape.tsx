import { useId } from "react";
import type { LandscapeId } from "../shared";

export interface LandscapeProps {
  landscape: LandscapeId;
  playing?: boolean;
  className?: string;
  miniature?: boolean;
}

/**
 * Stillwave landscapes — self-contained editorial vector scenes.
 *
 * Every instance mints unique gradient/filter IDs via React's useId so that
 * multiple Landscapes (main artwork + scene-card thumbnails + immersive) can
 * coexist on one page without ID collisions. The viewBox is 1000×520 with
 * preserveAspectRatio="xMidYMid slice" so the artwork crops gracefully across
 * the main ~960×450 stage and small card thumbnails alike.
 *
 * Animation is subtle and entirely CSS-driven (SMIL-free) so it can be paused
 * by the parent via the `playing` flag and respected by prefers-reduced-motion.
 * When `playing` is false a `paused` class suppresses the keyframe animations.
 */
export default function Landscape({
  landscape,
  playing = false,
  className,
  miniature = false,
}: LandscapeProps) {
  const uid = `sw${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const cls =
    `landscape landscape-${landscape} ${playing ? "is-playing" : "is-paused"} ${miniature ? "is-miniature" : ""} ${className ?? ""}`.trim();

  return (
    <svg
      className={cls}
      viewBox="0 0 1000 520"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${landscape} scene`}
    >
      <style>{landscapeStyles(uid)}</style>
      {landscape === "coast" && <Coast uid={uid} />}
      {landscape === "forest" && <Forest uid={uid} />}
      {landscape === "night" && <Night uid={uid} />}
      {landscape === "cabin" && <Cabin uid={uid} />}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * COAST — golden hour: pale apricot sky, huge low sun, hazy mountains,
 * winding ocean ribbons with glimmers, dark foreground grasses & rocks.
 * ------------------------------------------------------------------ */
function Coast({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6d9b0" />
          <stop offset="38%" stopColor="#f2c79c" />
          <stop offset="62%" stopColor="#eab78c" />
          <stop offset="82%" stopColor="#e0a982" />
          <stop offset="100%" stopColor="#d49b72" />
        </linearGradient>
        <radialGradient id={`${uid}-sunhalo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff4dc" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#ffe6b8" stopOpacity="0.55" />
          <stop offset="65%" stopColor="#ffd28a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffc06a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-suncore`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="60%" stopColor="#ffe9b4" />
          <stop offset="100%" stopColor="#ffd789" />
        </radialGradient>
        <linearGradient id={`${uid}-mtfar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c79a82" />
          <stop offset="100%" stopColor="#b0856c" />
        </linearGradient>
        <linearGradient id={`${uid}-mtmid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a87a64" />
          <stop offset="100%" stopColor="#8f6450" />
        </linearGradient>
        <linearGradient id={`${uid}-mtnear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#576453" />
          <stop offset="100%" stopColor="#314c41" />
        </linearGradient>
        <linearGradient id={`${uid}-seanear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9fa590" />
          <stop offset="100%" stopColor="#46695e" />
        </linearGradient>
        <linearGradient id={`${uid}-fore`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#283f32" />
          <stop offset="100%" stopColor="#172d24" />
        </linearGradient>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id={`${uid}-haze`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="1000" height="520" fill={`url(#${uid}-sky)`} />
      <g
        opacity="0.35"
        filter={`url(#${uid}-haze)`}
        fill="none"
        stroke="#fff0cf"
        strokeLinecap="round"
      >
        <path d="M-30 102 Q130 83 270 108 T600 103" strokeWidth="9" />
        <path d="M450 65 Q650 48 1040 78" strokeWidth="5" />
        <path d="M640 135 Q840 123 1010 141" strokeWidth="4" />
      </g>
      <g className={`coast-sun-${uid}`}>
        <circle cx="662" cy="210" r="180" fill={`url(#${uid}-sunhalo)`} />
        <circle cx="662" cy="210" r="93" fill={`url(#${uid}-sunhalo)`} />
        <circle cx="662" cy="210" r="58" fill={`url(#${uid}-suncore)`} />
        <circle cx="662" cy="210" r="53" fill="#fff4d7" opacity="0.85" />
      </g>
      <path
        d="M0 269 C58 252 87 213 132 220 C160 224 178 204 211 210 C256 226 268 240 303 232 C350 214 381 242 416 250 C477 265 520 261 569 277 L1000 277 L1000 340 L0 340Z"
        fill={`url(#${uid}-mtfar)`}
        opacity="0.52"
        filter={`url(#${uid}-haze)`}
      />
      <path
        d="M1000 250 C946 229 912 250 879 254 C839 259 813 244 780 266 L747 285 L1000 330Z"
        fill={`url(#${uid}-mtfar)`}
        opacity="0.48"
        filter={`url(#${uid}-soft)`}
      />
      <rect y="278" width="1000" height="242" fill={`url(#${uid}-seanear)`} />
      <path
        d="M0 282 Q500 274 1000 282"
        fill="none"
        stroke="#eed4aa"
        opacity="0.55"
      />
      <path
        d="M646 279 L678 279 L735 430 Q650 451 565 430Z"
        fill="#edd4a8"
        opacity="0.22"
        className={`coast-reflect-${uid}`}
      />
      <g fill="none" strokeLinecap="round" className={`coast-glints-${uid}`}>
        <path
          d="M525 294 Q659 290 797 294 M591 301 Q665 298 751 301 M546 310 Q651 306 802 311 M503 323 Q672 319 844 325"
          stroke="#ffe4b6"
          strokeWidth="1.6"
          opacity="0.5"
        />
        <path
          d="M408 332 Q640 326 1008 336 M235 352 Q678 340 1021 360 M190 379 Q526 366 836 383 T1015 391"
          stroke="#e6d3ae"
          strokeWidth="1.2"
          opacity="0.35"
        />
        <path
          d="M335 404 C532 379 782 432 1000 397 M313 435 C535 409 789 459 1000 429"
          stroke="#dde0c3"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M800 288 C722 310 572 303 581 327 C592 351 785 339 807 366 C833 395 564 398 489 431 C445 449 474 478 609 503"
          stroke="#dfe1c7"
          strokeWidth="3"
          opacity="0.65"
        />
        <path
          d="M824 292 C746 315 601 310 610 329 C623 353 816 346 834 370 C863 402 594 408 522 440 C484 457 519 489 650 509"
          stroke="#e6e4c8"
          strokeWidth="1"
          opacity="0.5"
        />
      </g>
      <path
        d="M0 230 C76 228 90 263 135 261 C166 257 169 289 218 284 C244 282 276 310 311 311 C355 315 360 334 407 338 C350 353 320 356 277 359 C245 363 242 387 202 390 C128 393 157 420 79 430 L0 462Z"
        fill={`url(#${uid}-mtmid)`}
        opacity="0.75"
      />
      <path
        d="M0 290 C46 280 74 309 100 307 C137 305 157 332 189 330 C229 328 242 359 301 356 C322 355 325 369 356 374 C314 384 285 383 265 399 C237 418 211 419 192 437 C163 463 157 459 122 473 L0 493Z"
        fill={`url(#${uid}-mtnear)`}
      />
      <path
        d="M0 331 C59 307 82 333 105 326 M75 355 Q152 346 194 371 M153 389 Q208 384 245 400"
        fill="none"
        stroke="#b3ac82"
        strokeWidth="1.5"
        opacity="0.27"
      />
      <path
        d="M1000 336 C966 342 954 354 929 354 C898 357 884 377 850 381 C823 386 836 412 783 418 C867 423 922 444 1000 445Z"
        fill="#465b46"
      />
      <path
        d="M1000 412 C950 411 925 442 877 442 C858 438 838 454 811 462 C783 468 765 477 732 486 L1000 520Z"
        fill={`url(#${uid}-fore)`}
      />
      <path
        d="M0 441 C59 442 91 457 141 469 C174 474 198 495 247 499 L296 520 L0 520Z"
        fill={`url(#${uid}-fore)`}
      />
      <g stroke="#253b2c" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M52 478 Q41 439 29 424 M51 478 Q63 426 69 414 M56 480 Q82 454 92 440 M101 495 Q110 454 115 447 M106 492 Q89 461 84 453" />
        <path d="M923 485 Q932 429 941 414 M928 487 Q906 453 897 447 M931 486 Q956 462 976 455 M866 494 Q871 453 879 440 M866 495 Q850 468 840 464 M988 500 Q980 451 983 434" />
      </g>
      <g fill="#233c32">
        <path d="M365 472 Q384 463 405 477 L398 482 L356 482Z" />
        <path d="M426 465 Q440 459 454 468 L450 473 L419 473Z" />
        <path d="M680 482 Q699 472 725 489 L718 495 L668 495Z" />
      </g>
      <g fill="#fff0c7" className={`coast-glints-${uid}`}>
        <circle cx="621" cy="314" r="1.4" className={`glint glint-a-${uid}`} />
        <circle cx="711" cy="330" r="1.1" className={`glint glint-b-${uid}`} />
        <circle cx="568" cy="358" r="1.6" className={`glint glint-c-${uid}`} />
        <circle cx="747" cy="395" r="1.3" className={`glint glint-a-${uid}`} />
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * FOREST — misty layered mountains and conifer silhouettes,
 * green/sage palette, drifting mist.
 * ------------------------------------------------------------------ */
function Forest({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cdd8c8" />
          <stop offset="50%" stopColor="#bccab6" />
          <stop offset="100%" stopColor="#a8baa0" />
        </linearGradient>
        <linearGradient id={`${uid}-mtfar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aae92" />
          <stop offset="100%" stopColor="#84a07a" />
        </linearGradient>
        <linearGradient id={`${uid}-mtmid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6e8a62" />
          <stop offset="100%" stopColor="#5a784f" />
        </linearGradient>
        <linearGradient id={`${uid}-mtnear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f5a36" />
          <stop offset="100%" stopColor="#2e4528" />
        </linearGradient>
        <linearGradient id={`${uid}-fore`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22341c" />
          <stop offset="100%" stopColor="#13200f" />
        </linearGradient>
        <linearGradient id={`${uid}-mist`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2ea" stopOpacity="0" />
          <stop offset="50%" stopColor="#eef2ea" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#eef2ea" stopOpacity="0" />
        </linearGradient>
        <filter id={`${uid}-haze`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="1000" height="520" fill={`url(#${uid}-sky)`} />

      {/* Soft light wash through the canopy */}
      <ellipse
        cx="420"
        cy="120"
        rx="380"
        ry="120"
        fill="#f0f4e8"
        opacity="0.32"
        filter={`url(#${uid}-haze)`}
      />

      {/* Far mountains */}
      <path
        d="M-20,300 L80,220 L170,260 L270,200 L380,250 L480,210 L580,252 L690,206 L800,250 L900,220 L1020,250 L1020,360 L-20,360 Z"
        fill={`url(#${uid}-mtfar)`}
        opacity="0.6"
        filter={`url(#${uid}-haze)`}
      />

      {/* Mist band */}
      <rect
        x="0"
        y="250"
        width="1000"
        height="120"
        fill={`url(#${uid}-mist)`}
        className={`forest-mist-${uid}`}
      />

      {/* Mid mountains */}
      <path
        d="M-20,340 L90,252 L190,290 L300,236 L410,288 L510,248 L620,290 L730,242 L840,288 L930,256 L1020,288 L1020,380 L-20,380 Z"
        fill={`url(#${uid}-mtmid)`}
        opacity="0.85"
        filter={`url(#${uid}-soft)`}
      />

      {/* Conifer silhouettes on mid ridge */}
      <g fill="#4a6640" opacity="0.7">
        {conifers(60, 252, 1, uid)}
        {conifers(180, 290, 0.9, uid)}
        {conifers(300, 236, 1.1, uid)}
        {conifers(440, 288, 0.8, uid)}
        {conifers(560, 248, 1, uid)}
        {conifers(700, 242, 1.05, uid)}
        {conifers(830, 288, 0.9, uid)}
        {conifers(950, 256, 1, uid)}
      </g>

      {/* Near ridge */}
      <path
        d="M-20,392 L100,300 L220,342 L340,288 L460,340 L580,296 L700,342 L820,290 L940,338 L1020,310 L1020,440 L-20,440 Z"
        fill={`url(#${uid}-mtnear)`}
      />

      {/* Near conifers — denser */}
      <g fill="#2e4528">
        {conifers(40, 392, 1.3, uid)}
        {conifers(120, 360, 1.1, uid)}
        {conifers(200, 392, 1.4, uid)}
        {conifers(300, 360, 1.2, uid)}
        {conifers(380, 392, 1.5, uid)}
        {conifers(480, 360, 1.1, uid)}
        {conifers(560, 392, 1.3, uid)}
        {conifers(660, 360, 1.2, uid)}
        {conifers(740, 392, 1.4, uid)}
        {conifers(840, 360, 1.1, uid)}
        {conifers(920, 392, 1.3, uid)}
      </g>

      {/* Foreground */}
      <rect x="0" y="432" width="1000" height="88" fill={`url(#${uid}-fore)`} />

      {/* Foreground ferns/grasses */}
      <g
        stroke="#13200f"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      >
        <path d="M40,490 Q44,450 46,432" />
        <path d="M52,492 Q58,456 62,434" />
        <path d="M70,490 Q68,452 66,432" />
        <path d="M180,494 Q186,454 190,434" />
        <path d="M194,496 Q202,460 206,436" />
        <path d="M170,492 Q166,454 164,434" />
        <path d="M340,494 Q346,452 350,432" />
        <path d="M356,496 Q364,458 368,436" />
        <path d="M520,492 Q526,450 530,432" />
        <path d="M536,494 Q544,456 548,434" />
        <path d="M700,494 Q706,452 710,432" />
        <path d="M716,496 Q724,458 728,436" />
        <path d="M880,492 Q886,450 890,432" />
        <path d="M896,494 Q904,456 908,434" />
      </g>

      {/* Low drifting mist at base */}
      <ellipse
        cx="500"
        cy="470"
        rx="520"
        ry="40"
        fill="#eef2ea"
        opacity="0.22"
        filter={`url(#${uid}-haze)`}
        className={`forest-mist-low-${uid}`}
      />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * NIGHT — starfield with crescent moon, indigo valleys.
 * ------------------------------------------------------------------ */
function Night({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0e26" />
          <stop offset="40%" stopColor="#131a3e" />
          <stop offset="75%" stopColor="#1e2650" />
          <stop offset="100%" stopColor="#2a3160" />
        </linearGradient>
        <radialGradient id={`${uid}-moonglow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#dfe6ff" stopOpacity="0.5" />
          <stop offset="45%" stopColor="#c8d4ff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#c8d4ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-mtfar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a3160" />
          <stop offset="100%" stopColor="#222a52" />
        </linearGradient>
        <linearGradient id={`${uid}-mtmid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2148" />
          <stop offset="100%" stopColor="#141a3a" />
        </linearGradient>
        <linearGradient id={`${uid}-mtnear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e1430" />
          <stop offset="100%" stopColor="#080c20" />
        </linearGradient>
        <linearGradient id={`${uid}-fore`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060916" />
          <stop offset="100%" stopColor="#03050d" />
        </linearGradient>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="1000" height="520" fill={`url(#${uid}-sky)`} />

      {/* Milky-way wash */}
      <ellipse
        cx="500"
        cy="180"
        rx="460"
        ry="80"
        fill="#3a4480"
        opacity="0.16"
        transform="rotate(-12 500 180)"
        filter={`url(#${uid}-soft)`}
      />

      {/* Stars — scattered, a few twinkle */}
      <g fill="#e8ecff">{stars(uid)}</g>

      {/* Crescent moon */}
      <g className={`night-moon-${uid}`}>
        <circle cx="740" cy="130" r="70" fill={`url(#${uid}-moonglow)`} />
        <circle cx="740" cy="130" r="34" fill="#eef1ff" />
        <circle cx="754" cy="124" r="32" fill="#1e2650" />
      </g>

      {/* Far indigo ridge */}
      <path
        d="M-20,330 L80,270 L180,300 L290,258 L400,298 L510,262 L620,300 L740,256 L860,298 L960,270 L1020,296 L1020,380 L-20,380 Z"
        fill={`url(#${uid}-mtfar)`}
        opacity="0.8"
        filter={`url(#${uid}-soft)`}
      />

      {/* Mid ridge */}
      <path
        d="M-20,390 L100,310 L220,350 L340,300 L460,348 L580,308 L700,350 L820,304 L940,348 L1020,320 L1020,430 L-20,430 Z"
        fill={`url(#${uid}-mtmid)`}
      />

      {/* Near ridge */}
      <path
        d="M-20,440 L120,360 L260,402 L400,350 L540,400 L680,356 L820,402 L960,360 L1020,388 L1020,470 L-20,470 Z"
        fill={`url(#${uid}-mtnear)`}
      />

      {/* A couple of distant pines on near ridge */}
      <g fill="#080c20">
        {conifers(300, 350, 0.7, uid)}
        {conifers(640, 356, 0.8, uid)}
        {conifers(880, 360, 0.7, uid)}
      </g>

      {/* Foreground */}
      <rect x="0" y="462" width="1000" height="58" fill={`url(#${uid}-fore)`} />

      {/* Fireflies / low glimmers */}
      <g className={`night-glints-${uid}`}>
        <circle
          cx="120"
          cy="452"
          r="1.6"
          fill="#cfe6a0"
          className={`glint glint-a-${uid}`}
        />
        <circle
          cx="280"
          cy="446"
          r="1.3"
          fill="#d8f0b0"
          className={`glint glint-b-${uid}`}
        />
        <circle
          cx="460"
          cy="452"
          r="1.5"
          fill="#cfe6a0"
          className={`glint glint-c-${uid}`}
        />
        <circle
          cx="620"
          cy="448"
          r="1.4"
          fill="#d8f0b0"
          className={`glint glint-a-${uid}`}
        />
        <circle
          cx="780"
          cy="452"
          r="1.6"
          fill="#cfe6a0"
          className={`glint glint-b-${uid}`}
        />
        <circle
          cx="920"
          cy="446"
          r="1.3"
          fill="#d8f0b0"
          className={`glint glint-c-${uid}`}
        />
      </g>

      {/* Foreground grasses */}
      <g
        stroke="#03050d"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        opacity="0.95"
      >
        <path d="M60,492 Q64,470 66,462" />
        <path d="M72,494 Q78,472 82,464" />
        <path d="M220,494 Q226,470 230,462" />
        <path d="M234,496 Q242,472 246,464" />
        <path d="M400,492 Q406,468 410,460" />
        <path d="M414,494 Q422,470 426,462" />
        <path d="M580,494 Q586,470 590,462" />
        <path d="M594,496 Q602,472 606,464" />
        <path d="M760,492 Q766,468 770,460" />
        <path d="M774,494 Q782,470 786,462" />
        <path d="M920,494 Q926,470 930,462" />
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * CABIN — warm rust landscape, glowing window cabin, pines, smoke.
 * ------------------------------------------------------------------ */
function Cabin({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2418" />
          <stop offset="35%" stopColor="#5e3a26" />
          <stop offset="70%" stopColor="#8a5436" />
          <stop offset="100%" stopColor="#a86840" />
        </linearGradient>
        <radialGradient id={`${uid}-windowsun`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffdc8a" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffdc8a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-mtfar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6e442c" />
          <stop offset="100%" stopColor="#5a3622" />
        </linearGradient>
        <linearGradient id={`${uid}-mtmid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4e3020" />
          <stop offset="100%" stopColor="#3c2414" />
        </linearGradient>
        <linearGradient id={`${uid}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2614" />
          <stop offset="100%" stopColor="#241608" />
        </linearGradient>
        <linearGradient id={`${uid}-snow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8c4a8" />
          <stop offset="100%" stopColor="#b8a088" />
        </linearGradient>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter id={`${uid}-haze`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="1000" height="520" fill={`url(#${uid}-sky)`} />

      {/* Warm horizon haze */}
      <ellipse
        cx="500"
        cy="300"
        rx="600"
        ry="90"
        fill="#c8854e"
        opacity="0.3"
        filter={`url(#${uid}-haze)`}
      />

      {/* Far mountains */}
      <path
        d="M-20,330 L100,250 L210,288 L320,240 L440,286 L560,244 L680,288 L800,242 L920,286 L1020,258 L1020,380 L-20,380 Z"
        fill={`url(#${uid}-mtfar)`}
        opacity="0.75"
        filter={`url(#${uid}-soft)`}
      />

      {/* Mid mountains */}
      <path
        d="M-20,380 L110,300 L230,338 L360,290 L490,336 L620,294 L750,338 L880,292 L1020,330 L1020,420 L-20,420 Z"
        fill={`url(#${uid}-mtmid)`}
      />

      {/* Snow caps on mid peaks */}
      <g fill={`url(#${uid}-snow)`} opacity="0.6">
        <path d="M100,250 L130,272 L110,300 L96,278 Z" />
        <path d="M320,240 L352,264 L360,290 L334,268 Z" />
        <path d="M560,244 L592,268 L620,294 L594,272 Z" />
        <path d="M800,242 L832,266 L880,292 L852,270 Z" />
      </g>

      {/* Distant pines */}
      <g fill="#3c2414" opacity="0.85">
        {conifers(80, 380, 0.9, uid)}
        {conifers(220, 380, 0.8, uid)}
        {conifers(700, 380, 0.85, uid)}
        {conifers(860, 380, 0.9, uid)}
      </g>

      {/* Ground */}
      <rect
        x="0"
        y="412"
        width="1000"
        height="108"
        fill={`url(#${uid}-ground)`}
      />

      {/* Cabin glow underlay */}
      <circle
        cx="500"
        cy="432"
        r="70"
        fill={`url(#${uid}-windowsun)`}
        className={`cabin-glow-${uid}`}
      />

      {/* Pines flanking the cabin */}
      <g fill="#241608">
        {conifers(360, 430, 1.6, uid)}
        {conifers(640, 430, 1.7, uid)}
        {conifers(300, 440, 1.2, uid)}
        {conifers(700, 440, 1.3, uid)}
      </g>

      {/* Cabin */}
      <g className={`cabin-body-${uid}`}>
        {/* walls */}
        <rect x="460" y="420" width="80" height="44" fill="#5a3622" />
        {/* roof */}
        <path d="M448,420 L500,392 L552,420 Z" fill="#3c2414" />
        <path d="M448,420 L552,420 L548,424 L452,424 Z" fill="#2e1a0e" />
        {/* chimney */}
        <rect x="520" y="396" width="10" height="20" fill="#4a2c1a" />
        {/* glowing window */}
        <rect
          x="478"
          y="430"
          width="22"
          height="20"
          fill="#ffce7a"
          className={`cabin-window-${uid}`}
        />
        <rect
          x="478"
          y="430"
          width="22"
          height="20"
          fill="#ffdc8a"
          filter={`url(#${uid}-glow)`}
          opacity="0.6"
        />
        {/* window frame */}
        <path
          d="M489,430 L489,450 M478,440 L500,440"
          stroke="#3c2414"
          strokeWidth="1.2"
          fill="none"
        />
        {/* door */}
        <rect x="504" y="436" width="12" height="28" fill="#2e1a0e" />
      </g>

      {/* Smoke from chimney */}
      <g className={`cabin-smoke-${uid}`} opacity="0.5">
        <circle
          cx="525"
          cy="388"
          r="8"
          fill="#9aa0a8"
          filter={`url(#${uid}-soft)`}
        />
        <circle
          cx="532"
          cy="372"
          r="10"
          fill="#aab0b8"
          filter={`url(#${uid}-soft)`}
        />
        <circle
          cx="528"
          cy="352"
          r="13"
          fill="#b8bec4"
          filter={`url(#${uid}-soft)`}
        />
        <circle
          cx="538"
          cy="328"
          r="15"
          fill="#c4c8ce"
          filter={`url(#${uid}-soft)`}
          opacity="0.7"
        />
      </g>

      {/* Foreground snow mound */}
      <path
        d="M0,486 Q200,470 400,488 Q600,500 800,482 Q900,474 1000,486 L1000,520 L0,520 Z"
        fill="#b8a088"
        opacity="0.5"
      />

      {/* Foreground grasses / sticks */}
      <g
        stroke="#140c04"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      >
        <path d="M60,500 Q66,484 68,472" />
        <path d="M74,502 Q82,484 86,472" />
        <path d="M200,502 Q206,484 210,472" />
        <path d="M214,504 Q222,486 226,474" />
        <path d="M780,502 Q786,484 790,472" />
        <path d="M794,504 Q802,486 806,474" />
        <path d="M900,502 Q906,484 910,472" />
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Reusable conifer silhouette at (x, baseY) with a scale factor.
 * ------------------------------------------------------------------ */
function conifers(x: number, baseY: number, scale: number, _uid: string) {
  return (
    <path
      transform={`translate(${x} ${baseY}) scale(${scale})`}
      d={`M0,0 L-14,-22 L-7,-22 L-18,-44 L-8,-44 L-20,-66 L-10,-66 L-13,-84 L-7,-84 L0,-100 L7,-84 L13,-84 L10,-66 L20,-66 L8,-44 L18,-44 L7,-22 L14,-22 Z`}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Deterministic star field for the night scene.
 * ------------------------------------------------------------------ */
function stars(uid: string) {
  const pts: { x: number; y: number; r: number; tw: string }[] = [
    { x: 60, y: 40, r: 1, tw: "a" },
    { x: 130, y: 80, r: 1.2, tw: "b" },
    { x: 200, y: 36, r: 0.9, tw: "c" },
    { x: 270, y: 110, r: 1, tw: "a" },
    { x: 340, y: 50, r: 1.3, tw: "b" },
    { x: 410, y: 90, r: 0.9, tw: "c" },
    { x: 480, y: 40, r: 1, tw: "a" },
    { x: 540, y: 120, r: 1.1, tw: "b" },
    { x: 610, y: 60, r: 0.9, tw: "c" },
    { x: 680, y: 100, r: 1, tw: "a" },
    { x: 850, y: 70, r: 1.2, tw: "b" },
    { x: 920, y: 40, r: 0.9, tw: "c" },
    { x: 970, y: 110, r: 1, tw: "a" },
    { x: 40, y: 150, r: 0.8, tw: "b" },
    { x: 160, y: 200, r: 1, tw: "c" },
    { x: 250, y: 170, r: 0.9, tw: "a" },
    { x: 360, y: 220, r: 1.1, tw: "b" },
    { x: 450, y: 190, r: 0.9, tw: "c" },
    { x: 560, y: 230, r: 1, tw: "a" },
    { x: 660, y: 200, r: 0.9, tw: "b" },
    { x: 760, y: 240, r: 1, tw: "c" },
    { x: 880, y: 210, r: 0.9, tw: "a" },
    { x: 980, y: 250, r: 0.8, tw: "b" },
    { x: 100, y: 280, r: 0.7, tw: "c" },
    { x: 300, y: 300, r: 0.8, tw: "a" },
    { x: 520, y: 290, r: 0.9, tw: "b" },
    { x: 740, y: 300, r: 0.8, tw: "c" },
    { x: 900, y: 280, r: 0.7, tw: "a" },
    { x: 220, y: 60, r: 0.7, tw: "b" },
    { x: 420, y: 150, r: 0.7, tw: "c" },
    { x: 600, y: 30, r: 0.8, tw: "a" },
    { x: 800, y: 150, r: 0.7, tw: "b" },
  ];
  return pts.map((p, i) => (
    <circle
      key={`${uid}-st-${i}`}
      cx={p.x}
      cy={p.y}
      r={p.r}
      className={i % 3 === 0 ? `star-twinkle star-twinkle-${uid}` : ""}
    />
  ));
}

/* ------------------------------------------------------------------ *
 * Scoped CSS keyframes & animation rules. Animations run only when the
 * svg has the `is-playing` class; `is-paused` freezes them. A global
 * prefers-reduced-motion block disables everything.
 * ------------------------------------------------------------------ */
function landscapeStyles(uid: string): string {
  return `
.landscape.is-playing .coast-sun-${uid} circle:nth-child(2){animation:${uid}-breathe 9s ease-in-out infinite;transform-origin:560px 248px;}
.landscape.is-playing .coast-reflect-${uid}{animation:${uid}-flicker 4s ease-in-out infinite;}
.landscape.is-playing .coast-glints-${uid} .glint{animation:${uid}-glint 3.2s ease-in-out infinite;}
.landscape.is-playing .glint-a-${uid}{animation-delay:0s!important;}
.landscape.is-playing .glint-b-${uid}{animation-delay:0.8s!important;}
.landscape.is-playing .glint-c-${uid}{animation-delay:1.6s!important;}
.landscape.is-playing .forest-mist-${uid}{animation:${uid}-drift 22s ease-in-out infinite;}
.landscape.is-playing .forest-mist-low-${uid}{animation:${uid}-drift2 26s ease-in-out infinite;}
.landscape.is-playing .night-moon-${uid} circle:first-child{animation:${uid}-breathe 11s ease-in-out infinite;transform-origin:740px 130px;}
.landscape.is-playing .star-twinkle-${uid}{animation:${uid}-twinkle 4s ease-in-out infinite;}
.landscape.is-playing .night-glints-${uid} .glint{animation:${uid}-glint 3.5s ease-in-out infinite;}
.landscape.is-playing .cabin-glow-${uid}{animation:${uid}-breathe 5s ease-in-out infinite;transform-origin:500px 432px;}
.landscape.is-playing .cabin-window-${uid}{animation:${uid}-warmth 4s ease-in-out infinite;}
.landscape.is-playing .cabin-smoke-${uid}{animation:${uid}-smoke 6s ease-in-out infinite;}
@keyframes ${uid}-breathe{0%,100%{opacity:0.95;}50%{opacity:0.7;}}
@keyframes ${uid}-flicker{0%,100%{opacity:0.45;}50%{opacity:0.65;}}
@keyframes ${uid}-glint{0%,100%{opacity:0.25;}50%{opacity:1;}}
@keyframes ${uid}-drift{0%,100%{transform:translateX(0);}50%{transform:translateX(40px);}}
@keyframes ${uid}-drift2{0%,100%{transform:translateX(0);}50%{transform:translateX(-30px);}}
@keyframes ${uid}-twinkle{0%,100%{opacity:0.4;}50%{opacity:1;}}
@keyframes ${uid}-warmth{0%,100%{fill:#ffce7a;}50%{fill:#ffdba0;}}
@keyframes ${uid}-smoke{0%,100%{transform:translateY(0);opacity:0.5;}50%{transform:translateY(-8px);opacity:0.35;}}
@media (prefers-reduced-motion: reduce){.landscape *{animation:none!important;}.landscape.is-playing .coast-sun-${uid} circle,.landscape.is-playing .cabin-smoke-${uid}{animation:none!important;}}
`;
}
