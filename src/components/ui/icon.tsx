/**
 * AppIcon — centralised icon system built on @phosphor-icons/react.
 *
 * Size conventions:
 *   xs   – 14  metadata, breadcrumbs
 *   sm   – 16  inline labels, badges
 *   md   – 18  compact buttons (default for icon-only buttons)
 *   base – 20  navigation, normal UI
 *   lg   – 24  section headers, feature icons
 *   xl   – 32  empty states
 *   2xl  – 48  hero / onboarding
 *
 * Weight conventions:
 *   regular  – body copy, metadata
 *   medium   – navigation, interactive elements (default)
 *   bold     – active/selected states
 *   duotone  – empty states, decorative
 */

import {
  // Navigation
  SquaresFour,
  CheckSquare,
  Timer,
  ChartBar,
  FolderOpen,
  CalendarBlank,
  // Actions
  Plus,
  MagnifyingGlass,
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  ArrowClockwise,
  SignOut,
  // UI chrome
  CaretDown,
  CaretUp,
  CaretLeft,
  CaretRight,
  DotsThreeVertical,
  DotsThreeOutline,
  X,
  List,
  SquaresFour as GridIcon,
  AlignLeft,
  // Status
  CheckCircle,
  Circle,
  Warning,
  Info,
  Spinner,
  // Task / work
  Play,
  Pause,
  Stop,
  Lightning,
  Clock,
  Tag,
  Folder,
  Briefcase,
  Eye,
  EyeSlash,
  Lock,
  LockOpen,
  Target,
  TrendUp,
  // Data
  CurrencyDollar,
  Download,
  Link,
  // Edit
  PencilSimple,
  Archive,
  Trash,
  Palette,
  // Misc
  User,
  At,
  // Empty state / decorative
  Checks,
  ClockCounterClockwise,
  SmileyXEyes,
  type Icon as PhosphorIcon,
  type IconWeight,
} from "@phosphor-icons/react";

export type { PhosphorIcon, IconWeight };

// ─── Size map ────────────────────────────────────────────────────────────────
export const ICON_SIZES = {
  xs: 14,
  sm: 16,
  md: 18,
  base: 20,
  lg: 24,
  xl: 32,
  "2xl": 48,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

// ─── Named icon map ───────────────────────────────────────────────────────────
// Use these keys everywhere instead of importing random Phosphor icons directly.
export const Icons = {
  // Navigation
  dashboard:    SquaresFour,
  tasks:        CheckSquare,
  timer:        Timer,
  report:       ChartBar,
  projects:     FolderOpen,
  calendar:     CalendarBlank,

  // Actions
  add:          Plus,
  search:       MagnifyingGlass,
  arrowRight:   ArrowRight,
  arrowUpRight: ArrowUpRight,
  arrowLeft:    ArrowLeft,
  refresh:      ArrowClockwise,
  signOut:      SignOut,

  // UI chrome
  caretDown:    CaretDown,
  caretUp:      CaretUp,
  caretLeft:    CaretLeft,
  caretRight:   CaretRight,
  moreVert:     DotsThreeVertical,
  moreHoriz:    DotsThreeOutline,
  close:        X,
  list:         List,
  grid:         GridIcon,
  alignLeft:    AlignLeft,

  // Status / feedback
  checkCircle:  CheckCircle,
  circle:       Circle,
  warning:      Warning,
  info:         Info,
  spinner:      Spinner,

  // Task / session
  play:         Play,
  pause:        Pause,
  stop:         Stop,
  lightning:    Lightning,
  clock:        Clock,
  tag:          Tag,
  folder:       Folder,
  briefcase:    Briefcase,
  eye:          Eye,
  eyeOff:       EyeSlash,
  lock:         Lock,
  lockOpen:     LockOpen,
  target:       Target,
  trending:     TrendUp,

  // Data / finance
  dollar:       CurrencyDollar,
  download:     Download,
  link:         Link,

  // Edit / destructive
  edit:         PencilSimple,
  archive:      Archive,
  trash:        Trash,
  palette:      Palette,

  // People / auth
  user:         User,
  at:           At,

  // Decorative / empty
  checks:       Checks,
  history:      ClockCounterClockwise,
  empty:        SmileyXEyes,
} as const;

export type IconName = keyof typeof Icons;

// ─── AppIcon component ────────────────────────────────────────────────────────
export interface AppIconProps {
  name: IconName;
  size?: IconSize | number;
  weight?: IconWeight;
  className?: string;
  /** aria-hidden defaults true — set false only if icon conveys meaning without adjacent label */
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}

export function AppIcon({
  name,
  size = "base",
  weight = "regular",
  className,
  "aria-hidden": ariaHidden = true,
  "aria-label": ariaLabel,
}: AppIconProps) {
  const Component = Icons[name];
  const px = typeof size === "number" ? size : ICON_SIZES[size];

  return (
    <Component
      size={px}
      weight={weight}
      className={className}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
    />
  );
}

// ─── Convenience re-exports for direct use ────────────────────────────────────
// Import individual icons from here, not from @phosphor-icons/react directly.
export {
  SquaresFour,
  CheckSquare,
  Timer,
  ChartBar,
  FolderOpen,
  CalendarBlank,
  Plus,
  MagnifyingGlass,
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  ArrowClockwise,
  SignOut,
  CaretDown,
  CaretUp,
  CaretLeft,
  CaretRight,
  DotsThreeVertical,
  DotsThreeOutline,
  X,
  List,
  AlignLeft,
  CheckCircle,
  Circle,
  Warning,
  Info,
  Spinner,
  Play,
  Pause,
  Stop,
  Lightning,
  Clock,
  Tag,
  Folder,
  Briefcase,
  Eye,
  EyeSlash,
  Lock,
  LockOpen,
  Target,
  TrendUp,
  CurrencyDollar,
  Download,
  Link,
  PencilSimple,
  Archive,
  Trash,
  Palette,
  User,
  At,
  Checks,
  ClockCounterClockwise,
};
