// UI Pattern Constants - Strategy-Compliant Design System
// Based on UI_UX_THEME_STRATEGY.md guidelines

export const buttonPatterns = {
  // Primary Actions (Pink) - High-impact actions that create, save, or commit changes
  primary: "bg-synthwave-neon-pink text-synthwave-bg-primary px-6 py-3 rounded-lg font-rajdhani font-semibold text-lg uppercase tracking-wide cursor-pointer transition-all duration-300 hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[48px] flex items-center justify-center",

  // Secondary Actions (Cyan) - Navigation and management actions
  secondary: "bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan px-6 py-3 rounded-lg font-rajdhani font-semibold text-lg uppercase tracking-wide cursor-pointer transition-all duration-300 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-lg hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[48px] flex items-center justify-center",

  // Special Actions (Purple) - AI-powered and premium features
  special: "bg-synthwave-neon-purple text-white px-6 py-3 rounded-lg font-rajdhani font-semibold text-lg uppercase tracking-wide cursor-pointer transition-all duration-300 hover:bg-synthwave-neon-purple/90 hover:shadow-lg hover:shadow-synthwave-neon-purple/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-purple/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[48px] flex items-center justify-center",

  // Small variants (32px height)
  primarySmall: "bg-synthwave-neon-pink text-synthwave-bg-primary px-3 py-1.5 rounded-md font-rajdhani font-medium text-sm uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-pink/90 hover:shadow-md hover:shadow-synthwave-neon-pink/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[32px] flex items-center justify-center",

  secondarySmall: "bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan px-3 py-1.5 rounded-md font-rajdhani font-medium text-sm uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-md hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[32px] flex items-center justify-center",

  // Medium variants (40px height)
  primaryMedium: "bg-synthwave-neon-pink text-synthwave-bg-primary px-4 py-2 rounded-lg font-rajdhani font-semibold text-base uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-pink/90 hover:shadow-md hover:shadow-synthwave-neon-pink/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[40px] flex items-center justify-center",

  secondaryMedium: "bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan px-4 py-2 rounded-lg font-rajdhani font-semibold text-base uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-md hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[40px] flex items-center justify-center",

  // Compact variants (48px height, text-sm) - For floating menus and compact interfaces
  primaryCompact: "bg-synthwave-neon-pink text-synthwave-bg-primary px-4 py-3 rounded-lg font-rajdhani font-semibold text-sm uppercase tracking-wide cursor-pointer transition-all duration-300 hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[48px] flex items-center justify-center",

  secondaryCompact: "bg-transparent border-2 border-synthwave-neon-cyan text-synthwave-neon-cyan px-4 py-3 rounded-lg font-rajdhani font-semibold text-sm uppercase tracking-wide cursor-pointer transition-all duration-300 hover:bg-synthwave-neon-cyan hover:text-synthwave-bg-primary hover:shadow-lg hover:shadow-synthwave-neon-cyan/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[48px] flex items-center justify-center",

  // Hero CTA (56px height) - Premium gradient button for landing pages and major CTAs
  heroCTA: "px-8 py-4 bg-gradient-to-r from-synthwave-neon-pink to-synthwave-neon-purple text-white font-rajdhani font-bold text-xl uppercase tracking-wide rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-synthwave-neon-pink/40 hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[56px] flex items-center justify-center cursor-pointer",

  // Loading state variants - For buttons showing loading spinners
  primaryMediumLoading: "bg-synthwave-neon-pink text-synthwave-bg-primary px-4 py-2 rounded-lg font-rajdhani font-semibold text-base uppercase tracking-wide min-h-[40px] flex items-center justify-center opacity-75 cursor-not-allowed",

  // Disabled state variants - For buttons when user is not authenticated or action unavailable
  primaryMediumDisabled: "bg-gray-600/20 border border-gray-600/50 text-gray-500 cursor-not-allowed px-4 py-2 rounded-lg font-rajdhani font-semibold text-base uppercase tracking-wide min-h-[40px] flex items-center justify-center",

  // Challenge Icon Container - Square gradient container for challenge/agitation icons
  challengeIcon: "w-16 h-16 bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple text-white rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-synthwave-neon-pink/40 hover:-translate-y-1 active:translate-y-0 flex items-center justify-center flex-shrink-0",

  // Mode Toggle Buttons - For conversation mode switching (Chat vs Build)
  // Base classes for all mode toggle buttons
  modeToggleBase: "px-2.5 py-0.5 rounded-lg font-rajdhani font-semibold text-xs uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5",

  // Chat mode active state (Cyan themed - no specific artifact)
  modeToggleChatActive: "bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan border-2 border-synthwave-neon-cyan/40",

  // Chat mode inactive state
  modeToggleChatInactive: "bg-synthwave-bg-primary/30 text-synthwave-neon-cyan border-2 border-transparent hover:border-synthwave-neon-cyan/20 hover:bg-synthwave-neon-cyan/10",

  // Program Design mode active state (Purple themed - creating program artifact)
  modeToggleProgramDesignActive: "bg-synthwave-neon-purple/20 text-synthwave-neon-purple border-2 border-synthwave-neon-purple/40",

  // Program Design mode inactive state
  modeToggleProgramDesignInactive: "bg-synthwave-bg-primary/30 text-synthwave-neon-purple border-2 border-transparent hover:border-synthwave-neon-purple/20 hover:bg-synthwave-neon-purple/10",

  // Mode toggle container
  modeToggleContainer: "flex items-center gap-1 bg-synthwave-bg-card/50 backdrop-blur-sm border border-synthwave-neon-cyan/10 rounded-lg px-1 py-0.5 shadow-lg",

  // Mode indicator badges - Artifact-focused naming for conversation modes (not interactive)
  // Program Design mode badge (purple themed) - shows on AI messages creating program design artifact
  modeBadgeProgramDesign: "flex items-center gap-1.5 px-2.5 py-0.5 bg-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 rounded-lg w-fit text-xs font-rajdhani font-semibold uppercase tracking-wide text-synthwave-neon-purple",
  // Workout Log mode badge (cyan themed) - shows on AI messages creating workout log artifact
  modeBadgeWorkoutLog: "flex items-center gap-1.5 px-2.5 py-0.5 bg-synthwave-neon-cyan/10 border border-synthwave-neon-cyan/30 rounded-lg w-fit text-xs font-rajdhani font-semibold uppercase tracking-wide text-synthwave-neon-cyan",

  // Tab Toggle Buttons - For switching between views (Weekly/Monthly, Current/All Weeks, etc.)
  tabToggleActive: "px-4 py-2 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide transition-all duration-200 bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan border-2 border-synthwave-neon-cyan/40",
  tabToggleInactive: "px-4 py-2 rounded-lg font-rajdhani font-bold text-sm uppercase tracking-wide transition-all duration-200 bg-synthwave-bg-primary/30 text-synthwave-neon-cyan border-2 border-transparent hover:border-synthwave-neon-cyan/20 hover:bg-synthwave-neon-cyan/10"
};

// Badge Patterns - Reusable badge/tag components (matches ManageMemories.jsx styling)
export const badgePatterns = {
  // Pink badges - For high priority, primary categorization
  pink: "bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-1 rounded text-xs font-rajdhani",
  pinkBorder: "bg-synthwave-neon-pink/20 text-synthwave-neon-pink px-2 py-1 rounded text-xs font-rajdhani border border-synthwave-neon-pink/40",

  // Cyan badges - For secondary categorization, info tags
  cyan: "bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-1 rounded text-xs font-rajdhani",
  cyanBorder: "bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan px-2 py-1 rounded text-xs font-rajdhani border border-synthwave-neon-cyan/40",

  // Purple badges - For special categorization
  purple: "bg-synthwave-neon-purple/20 text-synthwave-neon-purple px-2 py-1 rounded text-xs font-rajdhani",
  purpleBorder: "bg-synthwave-neon-purple/20 text-synthwave-neon-purple px-2 py-1 rounded text-xs font-rajdhani border border-synthwave-neon-purple/40",

  // Muted badges - For low priority or secondary information
  muted: "bg-synthwave-text-secondary/20 text-synthwave-text-secondary px-2 py-1 rounded text-xs font-rajdhani",
  mutedBorder: "bg-synthwave-text-secondary/20 text-synthwave-text-secondary px-2 py-1 rounded text-xs font-rajdhani border border-synthwave-text-muted/40",

  // Workout detail badges - For equipment and exercise lists (cyan themed)
  workoutDetail: "px-2 py-1 bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/30 rounded text-sm font-rajdhani text-synthwave-text-secondary",

  // Count badges - For numerical indicators (sidebar, calendar, etc.) - matches SidebarNav styling
  countBase: "min-w-[24px] h-[24px] px-1 rounded-lg flex items-center justify-center font-rajdhani font-bold text-sm transition-all duration-150",
  countPink: "bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20",
  countCyan: "bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20",
  countPurple: "bg-synthwave-neon-purple/10 text-synthwave-neon-purple hover:bg-synthwave-neon-purple/20",
  countMuted: "bg-synthwave-text-muted/10 text-synthwave-text-muted hover:bg-synthwave-text-muted/20"
};

export const iconButtonPatterns = {
  // Minimal Clean - Just color change on hover (Pink)
  minimal: "p-3 text-synthwave-neon-pink hover:text-synthwave-neon-pink/80 hover:bg-synthwave-neon-pink/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary",

  // Soft Background - Subtle background with hover enhancement (Pink)
  softBg: "p-3 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 hover:text-synthwave-neon-pink rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50",

  // Bordered - Border with hover fill (Cyan)
  bordered: "p-3 border border-synthwave-neon-cyan/30 text-synthwave-neon-cyan hover:border-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50",

  // Solid Fill - Full background with shadow (Pink)
  solid: "p-3 bg-synthwave-neon-pink text-synthwave-bg-primary hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary",

  // Solid Fill Cyan - Full background with shadow (Cyan)
  solidCyan: "p-3 bg-synthwave-neon-cyan text-synthwave-bg-primary hover:bg-synthwave-neon-cyan/90 hover:shadow-lg hover:shadow-synthwave-neon-cyan/30 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary",

  // Floating - Glassmorphism with backdrop blur (Pink)
  floating: "p-3 bg-synthwave-bg-card/80 backdrop-blur-sm border border-synthwave-neon-pink/20 text-synthwave-neon-pink hover:border-synthwave-neon-pink/50 hover:bg-synthwave-bg-card hover:shadow-lg hover:shadow-synthwave-neon-pink/20 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50",

  // Glow Effect - Animated glow (Cyan)
  glow: "p-3 bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/30 hover:shadow-lg hover:shadow-synthwave-neon-cyan/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 animate-pulse-glow",

  // Small Action Buttons - Modern versions of chat action buttons with dark background by default (like microphone button)
  // Icons should be w-5 h-5 (20px) for consistent sizing across all action buttons
  actionSmallBlue: "p-2 sm:p-2.5 bg-synthwave-bg-primary/50 text-synthwave-text-secondary hover:text-blue-400 hover:bg-blue-400/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 min-h-[40px] min-w-[40px] flex items-center justify-center",

  actionSmallGreen: "p-2 sm:p-2.5 bg-synthwave-bg-primary/50 text-synthwave-text-secondary hover:text-green-400 hover:bg-green-400/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400/50 min-h-[40px] min-w-[40px] flex items-center justify-center",

  actionSmallPurple: "p-2 sm:p-2.5 bg-synthwave-bg-primary/50 text-synthwave-text-secondary hover:text-purple-400 hover:bg-purple-400/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400/50 min-h-[40px] min-w-[40px] flex items-center justify-center",

  actionSmallPink: "p-2 sm:p-2.5 bg-synthwave-bg-primary/50 text-synthwave-text-secondary hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] min-w-[40px] flex items-center justify-center",

  actionSmallCyan: "p-2 sm:p-2.5 bg-synthwave-bg-primary/50 text-synthwave-text-secondary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 min-h-[40px] min-w-[40px] flex items-center justify-center",

  // Compact delete button - For card corner delete actions (smaller than minimal, starts muted)
  deleteCompact: "p-1.5 text-synthwave-text-muted hover:text-synthwave-neon-pink hover:bg-synthwave-neon-pink/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary"
};

export const formPatterns = {
  // Label for form inputs (AuthInput, FormInput, Settings)
  label: "block font-rajdhani text-lg text-synthwave-text-secondary mb-2 font-medium uppercase tracking-wide",

  // Error message text below inputs
  errorText: "mt-2 text-red-400 font-rajdhani text-sm",

  // Helper/description text below inputs
  helperText: "font-rajdhani text-sm text-synthwave-text-secondary",

  // Subsection headers (like "Added", "Changed", "Fixed" in Changelog)
  subsectionHeader: "font-rajdhani font-bold text-white text-lg mb-3 flex items-center space-x-2",

  // Availability indicator container (negative margin pulls it up into AuthInput's mb-6 space)
  availabilityContainer: "-mt-4 flex items-center gap-2",

  // Availability indicator text - available (cyan)
  availabilityAvailable: "text-synthwave-neon-cyan font-rajdhani text-sm font-medium",

  // Availability indicator text - taken (pink/red)
  availabilityTaken: "text-synthwave-neon-pink font-rajdhani text-sm font-medium",

  // Availability indicator text - checking (muted)
  availabilityChecking: "text-synthwave-text-muted font-rajdhani text-sm font-medium",

  // Availability icon container (for checkmark/X)
  availabilityIcon: "flex-shrink-0"
};

export const inputPatterns = {
  // Standard input field with glassmorphism - enhanced for autocomplete stability
  standard: "w-full px-4 py-3 bg-synthwave-bg-primary/30 backdrop-blur-sm border border-synthwave-neon-pink/20 rounded-xl text-synthwave-text-primary placeholder-synthwave-text-muted font-rajdhani transition-all duration-300 outline-none focus:outline-none focus:border-synthwave-neon-pink focus:bg-synthwave-bg-primary/50 focus:ring-2 focus:ring-synthwave-neon-pink/20 focus:ring-offset-0 focus:ring-offset-transparent focus:shadow-none min-h-[48px] [-webkit-appearance:none] [appearance:none] [&:-webkit-autofill]:!px-4 [&:-webkit-autofill]:!py-3 [&:-webkit-autofill]:!min-h-[48px] [&:-webkit-autofill]:!border-[1px] [&:-webkit-autofill]:!border-solid [&:-webkit-autofill]:!bg-synthwave-bg-primary/30 [&:-webkit-autofill]:!border-synthwave-neon-pink/20 [&:-webkit-autofill]:!rounded-xl [&:-webkit-autofill]:!shadow-none [&:-webkit-autofill]:!outline-none [&:-webkit-autofill]:!box-shadow-[0_0_0_1000px_rgba(15,23,42,0.47)_inset] [&:-webkit-autofill:hover]:!px-4 [&:-webkit-autofill:hover]:!py-3 [&:-webkit-autofill:hover]:!min-h-[48px] [&:-webkit-autofill:hover]:!border-[1px] [&:-webkit-autofill:hover]:!border-solid [&:-webkit-autofill:hover]:!bg-synthwave-bg-primary/30 [&:-webkit-autofill:hover]:!border-synthwave-neon-pink/20 [&:-webkit-autofill:hover]:!rounded-xl [&:-webkit-autofill:hover]:!shadow-none [&:-webkit-autofill:hover]:!outline-none [&:-webkit-autofill:hover]:!box-shadow-[0_0_0_1000px_rgba(15,23,42,0.47)_inset] [&:-webkit-autofill:focus]:!px-4 [&:-webkit-autofill:focus]:!py-3 [&:-webkit-autofill:focus]:!min-h-[48px] [&:-webkit-autofill:focus]:!border-[1px] [&:-webkit-autofill:focus]:!border-solid [&:-webkit-autofill:focus]:!bg-synthwave-bg-primary/50 [&:-webkit-autofill:focus]:!border-synthwave-neon-pink [&:-webkit-autofill:focus]:!rounded-xl [&:-webkit-autofill:focus]:!shadow-none [&:-webkit-autofill:focus]:!outline-none [&:-webkit-autofill:focus]:!box-shadow-[0_0_0_1000px_rgba(15,23,42,0.5)_inset]",

  // Chat input field - matches CoachConversations styling (with right padding for emoji button)
  chatInput: "w-full px-4 py-3 pr-12 bg-synthwave-bg-primary/50 border-2 border-synthwave-neon-pink/30 rounded-2xl text-synthwave-text-primary font-rajdhani outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus:border-synthwave-neon-pink focus:px-4 focus:py-3 hover:border-synthwave-neon-pink/50 transition-colors resize-none placeholder-synthwave-text-muted synthwave-scrollbar max-h-[120px] overflow-y-auto min-h-[48px] box-border",

  // Command palette input field - same styling but without right padding
  commandInput: "w-full px-4 py-3 bg-synthwave-bg-primary/50 border-2 border-synthwave-neon-pink/30 rounded-2xl text-synthwave-text-primary font-rajdhani outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus:border-synthwave-neon-pink focus:px-4 focus:py-3 hover:border-synthwave-neon-pink/50 transition-colors resize-none placeholder-synthwave-text-muted synthwave-scrollbar max-h-[120px] overflow-y-auto min-h-[48px] box-border",

  // Error state input - enhanced for autocomplete stability
  error: "w-full px-4 py-3 bg-synthwave-bg-primary/30 backdrop-blur-sm border border-red-400 rounded-xl text-synthwave-text-primary placeholder-synthwave-text-muted font-rajdhani transition-all duration-300 outline-none focus:outline-none focus:border-red-500 focus:bg-synthwave-bg-primary/50 focus:ring-2 focus:ring-red-400/20 focus:ring-offset-0 focus:ring-offset-transparent focus:shadow-none min-h-[48px] [-webkit-appearance:none] [appearance:none] [&:-webkit-autofill]:!px-4 [&:-webkit-autofill]:!py-3 [&:-webkit-autofill]:!min-h-[48px] [&:-webkit-autofill]:!border-[1px] [&:-webkit-autofill]:!border-solid [&:-webkit-autofill]:!bg-synthwave-bg-primary/30 [&:-webkit-autofill]:!border-red-400 [&:-webkit-autofill]:!rounded-xl [&:-webkit-autofill]:!shadow-none [&:-webkit-autofill]:!outline-none [&:-webkit-autofill]:!box-shadow-[0_0_0_1000px_rgba(15,23,42,0.47)_inset] [&:-webkit-autofill:hover]:!px-4 [&:-webkit-autofill:hover]:!py-3 [&:-webkit-autofill:hover]:!min-h-[48px] [&:-webkit-autofill:hover]:!border-[1px] [&:-webkit-autofill:hover]:!border-solid [&:-webkit-autofill:hover]:!bg-synthwave-bg-primary/30 [&:-webkit-autofill:hover]:!border-red-400 [&:-webkit-autofill:hover]:!rounded-xl [&:-webkit-autofill:hover]:!shadow-none [&:-webkit-autofill:hover]:!outline-none [&:-webkit-autofill:hover]:!box-shadow-[0_0_0_1000px_rgba(15,23,42,0.47)_inset] [&:-webkit-autofill:focus]:!px-4 [&:-webkit-autofill:focus]:!py-3 [&:-webkit-autofill:focus]:!min-h-[48px] [&:-webkit-autofill:focus]:!border-[1px] [&:-webkit-autofill:focus]:!border-solid [&:-webkit-autofill:focus]:!bg-synthwave-bg-primary/50 [&:-webkit-autofill:focus]:!border-red-500 [&:-webkit-autofill:focus]:!rounded-xl [&:-webkit-autofill:focus]:!shadow-none [&:-webkit-autofill:focus]:!outline-none [&:-webkit-autofill:focus]:!box-shadow-[0_0_0_1000px_rgba(15,23,42,0.5)_inset]",

  // Inline edit input - for editing titles and text in place
  inlineEdit: "bg-synthwave-bg-primary/50 border-2 border-synthwave-neon-pink/30 rounded-lg font-rajdhani text-white placeholder-synthwave-text-secondary outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus:border-synthwave-neon-pink hover:border-synthwave-neon-pink/50 transition-all",

  // Textarea input - matches standard input styling but for multi-line text - enhanced for autocomplete stability
  textarea: "w-full px-4 py-3 bg-synthwave-bg-primary/30 backdrop-blur-sm border border-synthwave-neon-pink/20 rounded-xl text-synthwave-text-primary placeholder-synthwave-text-muted font-rajdhani transition-all duration-300 outline-none focus:outline-none focus:border-synthwave-neon-pink focus:bg-synthwave-bg-primary/50 focus:ring-2 focus:ring-synthwave-neon-pink/20 focus:ring-offset-0 focus:ring-offset-transparent focus:shadow-none hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 min-h-[120px] resize-vertical [-webkit-appearance:none] [appearance:none]",

  // Error state textarea - enhanced for autocomplete stability
  textareaError: "w-full px-4 py-3 bg-synthwave-bg-primary/30 backdrop-blur-sm border border-red-400 rounded-xl text-synthwave-text-primary placeholder-synthwave-text-muted font-rajdhani transition-all duration-300 outline-none focus:outline-none focus:border-red-500 focus:bg-synthwave-bg-primary/50 focus:ring-2 focus:ring-red-400/20 focus:ring-offset-0 focus:ring-offset-transparent focus:shadow-none min-h-[120px] resize-vertical [-webkit-appearance:none] [appearance:none]",

  // Select dropdown - matches standard input styling but for select elements
  select: "w-full px-4 py-3 bg-synthwave-bg-primary/30 backdrop-blur-sm border border-synthwave-neon-pink/20 rounded-xl text-synthwave-text-primary placeholder-synthwave-text-muted font-rajdhani transition-all duration-300 outline-none focus:outline-none focus:border-synthwave-neon-pink focus:bg-synthwave-bg-primary/50 focus:ring-2 focus:ring-synthwave-neon-pink/20 focus:ring-offset-0 focus:ring-offset-transparent focus:shadow-none min-h-[48px] [-webkit-appearance:none] [appearance:none] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50",

  // Checkbox - Custom styled checkbox with synthwave theme
  checkbox: "appearance-none w-5 h-5 rounded border border-synthwave-neon-pink/20 bg-synthwave-bg-primary/30 backdrop-blur-sm text-synthwave-neon-pink focus:ring-2 focus:ring-synthwave-neon-pink/20 focus:ring-offset-0 cursor-pointer checked:bg-gradient-to-br checked:from-synthwave-neon-purple checked:to-synthwave-neon-pink checked:border-synthwave-neon-pink transition-all duration-300 hover:border-synthwave-neon-pink/40 checked:shadow-lg checked:shadow-synthwave-neon-pink/50 disabled:opacity-50 disabled:cursor-not-allowed"
};

// Inline Edit Patterns - Standardized inline editing UI for consistent user experience
// Used by InlineEditField component and matches FormInput/AuthInput styling
export const inlineEditPatterns = {
  // Container patterns
  displayContainer: "flex items-center space-x-2 group",
  editContainer: "flex items-center space-x-2 w-full",

  // Edit button patterns (show on hover in display mode)
  editButton: {
    small: "p-1 text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-lg",
    medium: "p-1.5 text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50",
    large: "p-2 text-synthwave-text-secondary hover:text-synthwave-neon-cyan transition-colors duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50"
  },

  // Save button patterns (pink primary action)
  saveButton: {
    small: "p-1 bg-synthwave-neon-pink text-synthwave-bg-primary hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary disabled:opacity-50 disabled:cursor-not-allowed",
    medium: "p-1.5 bg-synthwave-neon-pink text-synthwave-bg-primary hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary disabled:opacity-50 disabled:cursor-not-allowed",
    large: "p-2 bg-synthwave-neon-pink text-synthwave-bg-primary hover:bg-synthwave-neon-pink/90 hover:shadow-lg hover:shadow-synthwave-neon-pink/30 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
  },

  // Cancel button patterns (cyan secondary action)
  cancelButton: {
    small: "p-1 border border-synthwave-neon-cyan/30 text-synthwave-neon-cyan hover:border-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed",
    medium: "p-1.5 border border-synthwave-neon-cyan/30 text-synthwave-neon-cyan hover:border-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed",
    large: "p-2 border border-synthwave-neon-cyan/30 text-synthwave-neon-cyan hover:border-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed"
  },

  // Icon sizes (standardized across all inline edits)
  iconSize: {
    edit: {
      small: "w-4 h-4",
      medium: "w-5 h-5",  // Primary/default size - better visibility
      large: "w-6 h-6"
    },
    action: { // save/cancel icons
      small: "w-3 h-3",
      medium: "w-4 h-4",
      large: "w-5 h-5"
    }
  },

  // Input field sizes (uses inputPatterns.inlineEdit as base)
  inputSize: {
    small: "text-base px-2 py-1 min-w-48 max-w-full",
    medium: "text-lg px-3 py-1.5 min-w-64 max-w-full",
    large: "text-xl px-4 py-2 flex-1 max-w-full"
  },

  // Display text sizes
  displayTextSize: {
    small: "text-lg",
    medium: "text-xl",
    large: "text-2xl"
  },

  // Tooltip configuration (consistent positioning and styling)
  tooltip: {
    offset: {
      edit: 4,    // Edit tooltip on top
      action: 8   // Save/cancel tooltips on bottom
    },
    transform: "translateX(-8px)",  // Horizontal alignment adjustment
    style: {
      backgroundColor: '#000',
      color: '#fff',
      borderRadius: '8px',
      fontFamily: 'Rajdhani',
      fontSize: '14px',
      padding: '8px 12px',
      zIndex: 99999
    }
  }
};

export const imagePreviewPatterns = {
  // Image preview container - for uploaded/selected images (overflow-visible to show remove button)
  container: "relative flex-shrink-0 w-16 h-16 rounded-lg border-2 border-synthwave-neon-cyan/30 bg-synthwave-bg-primary",

  // Image element - rounded to match container
  image: "w-full h-full object-cover rounded-md",

  // Remove button - neon pink themed, positioned on corner border
  removeButton: "absolute -top-2 -right-2 bg-synthwave-neon-pink text-white rounded-full p-1 hover:bg-synthwave-neon-pink/80 transition-colors duration-200 shadow-lg shadow-synthwave-neon-pink/50",

  // Size label - bottom overlay with rounded bottom corners
  sizeLabel: "absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 font-rajdhani rounded-b-md",

  // Grid container for multiple images (pt-2 for remove button clearance)
  grid: "flex items-center gap-2 overflow-x-auto pt-2 pb-2 synthwave-scrollbar-cyan"
};

export const containerPatterns = {
  // Main content containers - Subtle glassmorphism (recommended)
  mainContent: "bg-synthwave-bg-card/30 backdrop-blur-xl border border-synthwave-neon-cyan/10 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/5 hover:bg-synthwave-bg-card/40 hover:border-synthwave-neon-cyan/15",

  // Enhanced glassmorphism - More visual impact with gradient backgrounds and stronger shadows
  mainContentEnhanced: "bg-gradient-to-br from-synthwave-bg-card/40 to-synthwave-bg-card/20 backdrop-blur-2xl border border-synthwave-neon-cyan/15 rounded-2xl shadow-2xl shadow-synthwave-neon-cyan/10 hover:from-synthwave-bg-card/50 hover:to-synthwave-bg-card/30 hover:border-synthwave-neon-cyan/20 hover:shadow-2xl hover:shadow-synthwave-neon-cyan/15 transition-all duration-300",

  // Card containers - Different opacity levels
  cardLight: "bg-synthwave-bg-card/20 backdrop-blur-sm border border-synthwave-neon-pink/20 rounded-2xl shadow-lg shadow-synthwave-neon-pink/10 transition-all duration-300 hover:bg-synthwave-bg-card/40 hover:border-synthwave-neon-pink/40 hover:shadow-xl hover:shadow-synthwave-neon-pink/20 hover:-translate-y-1",

  cardMedium: "bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20 hover:shadow-2xl hover:shadow-synthwave-neon-cyan/30 transition-all duration-300 hover:-translate-y-2",

  cardMediumOpaque: "bg-synthwave-bg-card/95 border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/20",

  cardHeavy: "bg-synthwave-bg-card/50 backdrop-blur-xl border border-synthwave-neon-purple/30 rounded-2xl shadow-2xl shadow-synthwave-neon-purple/20 transition-all duration-300 hover:bg-synthwave-bg-card/60 hover:border-synthwave-neon-purple/50 hover:shadow-2xl hover:shadow-synthwave-neon-purple/30 hover:-translate-y-1",

  // Special purpose containers
  templateCard: "bg-synthwave-bg-card/60 border border-synthwave-neon-pink/20 rounded-2xl shadow-xl shadow-synthwave-neon-pink/20 hover:shadow-2xl hover:shadow-synthwave-neon-pink/30 transition-all duration-300 hover:-translate-y-2",

  loadingCard: "bg-synthwave-bg-card/30 backdrop-blur-lg border border-synthwave-neon-cyan/20 rounded-2xl shadow-xl shadow-synthwave-neon-cyan/10",

  // Minimal containers (no borders)
  minimal: "bg-synthwave-bg-card/25 rounded-2xl shadow-xl transition-all duration-300 hover:bg-synthwave-bg-card/40 hover:-translate-y-1",

  // Light Glass - Pure glassmorphism with white/transparent styling (from Theme.jsx)
  lightGlass: "bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl",

  // Medium Glass - Enhanced glassmorphism with themed background and colored shadows (from Theme.jsx)
  mediumGlass: "bg-synthwave-bg-card/30 backdrop-blur-lg border border-synthwave-neon-cyan/20 rounded-2xl p-6 shadow-xl shadow-synthwave-neon-cyan/10",

  // Medium Glass Pink - Pink variant for mission sections and pink-themed content
  mediumGlassPink: "bg-synthwave-bg-card/30 backdrop-blur-lg border border-synthwave-neon-pink/20 rounded-2xl p-6 shadow-xl shadow-synthwave-neon-pink/10",

  // Medium Glass Purple - Purple variant for purple-themed content
  mediumGlassPurple: "bg-synthwave-bg-card/30 backdrop-blur-lg border border-synthwave-neon-purple/20 rounded-2xl p-6 shadow-xl shadow-synthwave-neon-purple/10",

  // Bold Gradient - Multi-color neon gradient container (from Theme.jsx)
  boldGradient: "bg-gradient-to-br from-synthwave-neon-pink/20 via-synthwave-neon-purple/10 to-synthwave-neon-cyan/20 border border-synthwave-neon-cyan/30 rounded-xl p-6",

  // Dashed border containers for create/add actions and in-progress states
  // Base pink variant - for create actions and failed states
  dashedCard: "bg-synthwave-bg-card/20 backdrop-blur-sm border-2 border-dashed border-synthwave-neon-pink/30 rounded-2xl shadow-lg shadow-synthwave-neon-pink/10 transition-all duration-300 hover:bg-synthwave-bg-card/40 hover:border-synthwave-neon-pink/50 hover:shadow-xl hover:shadow-synthwave-neon-pink/20 hover:-translate-y-1",

  // Pink variant for failed states - higher opacity borders for emphasis
  dashedCardPinkBold: "bg-synthwave-bg-card/20 backdrop-blur-sm border-2 border-dashed border-synthwave-neon-pink/50 rounded-2xl shadow-lg shadow-synthwave-neon-pink/10 transition-all duration-300 hover:bg-synthwave-bg-card/30 hover:border-synthwave-neon-pink/70 hover:shadow-xl hover:shadow-synthwave-neon-pink/20 hover:-translate-y-1",

  // Cyan variant for building states
  dashedCardCyan: "bg-synthwave-bg-card/20 backdrop-blur-sm border-2 border-dashed border-synthwave-neon-cyan/50 rounded-2xl shadow-lg shadow-synthwave-neon-cyan/10 transition-all duration-300 hover:bg-synthwave-bg-card/30 hover:border-synthwave-neon-cyan/70 hover:shadow-xl hover:shadow-synthwave-neon-cyan/20 hover:-translate-y-1",

  // Purple variant for incomplete states
  dashedCardPurple: "bg-synthwave-bg-card/20 backdrop-blur-sm border-2 border-dashed border-synthwave-neon-purple/30 rounded-2xl shadow-lg shadow-synthwave-neon-purple/10 transition-all duration-300 hover:bg-synthwave-bg-card/40 hover:border-synthwave-neon-purple/50 hover:shadow-xl hover:shadow-synthwave-neon-purple/20 hover:-translate-y-1",

  // Content-focused card without headers (for memories, notes, messages)
  contentCard: "bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl p-6 shadow-xl shadow-synthwave-neon-cyan/20 hover:border-synthwave-neon-cyan/40 hover:bg-synthwave-bg-card/40 transition-all duration-300 hover:-translate-y-2",

  // Chat Message Bubbles - Themed containers for conversation messages
  // User message bubble - Pink gradient with rounded corner (removed backdrop-blur to prevent scroll artifacts)
  userMessageBubble: "px-4 py-3 rounded-2xl rounded-br-md shadow-xl bg-gradient-to-br from-synthwave-neon-pink/80 to-synthwave-neon-pink/60 text-white border-0 shadow-synthwave-neon-pink/30",

  // AI Chat Bubble - Modern glassmorphism with cyan background tint (default Chat mode) (removed backdrop-blur to prevent scroll artifacts)
  aiChatBubble: "bg-synthwave-neon-cyan/10 border border-synthwave-neon-cyan/20 text-synthwave-text-primary rounded-2xl rounded-bl-md shadow-xl shadow-synthwave-neon-cyan/20",

  // AI Program Design Mode Bubble - Purple gradient for program design artifact creation (removed backdrop-blur to prevent scroll artifacts)
  aiProgramDesignModeBubble: "px-4 py-3 rounded-2xl rounded-bl-md shadow-lg bg-gradient-to-br from-synthwave-neon-purple/5 to-synthwave-neon-purple/10 border border-synthwave-neon-purple/30 text-synthwave-text-primary shadow-synthwave-neon-purple/10",

  // Info Card - Static information display without hover effects
  infoCard: "bg-synthwave-bg-card/30 border border-synthwave-neon-pink/20 rounded-lg p-3",

  // Scrollable container with cyan scrollbar
  scrollableCyan: "overflow-y-auto synthwave-scrollbar-cyan",

  // Error state container - matches Theme.jsx error state pattern
  errorState: "bg-red-500/10 border border-red-500/30 rounded-xl p-6",

  // Inline error state - smaller version for inline usage
  inlineError: "bg-red-500/10 border border-red-500/30 rounded-lg p-4",

  // Collapsible section container - Modern 2025 style
  collapsibleSection: "bg-synthwave-bg-card/40 backdrop-blur-sm border border-synthwave-neon-cyan/20 rounded-2xl shadow-lg shadow-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/30 transition-all duration-300",

  // Collapsible section header
  collapsibleHeader: "w-full px-6 py-4 bg-transparent hover:bg-synthwave-bg-card/20 transition-all duration-200 flex items-center justify-between text-left rounded-t-2xl",

  // Collapsible section content
  collapsibleContent: "px-6 py-4 bg-synthwave-bg-card/10 rounded-b-2xl",

  // Info card cyan variant - for AI summaries and content sections (matches exercise container styling)
  infoCardCyan: "bg-synthwave-bg-primary/20 border border-synthwave-neon-cyan/20 rounded-lg p-3",

  // Static minimal card - matches Theme.jsx minimal card without hover effects (for tips, static content)
  // Note: Default padding is p-6, but can be overridden (e.g., ChatInput uses px-3 py-1)
  minimalCardStatic: "bg-synthwave-bg-card/20 border-0 rounded-2xl p-6",

  // Editable workout description container - Enhanced glassmorphism with larger font
  workoutDescriptionEditable: "w-full px-4 py-4 bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg text-synthwave-text-secondary font-rajdhani text-base leading-relaxed whitespace-pre-line resize-none min-h-[120px] transition-all duration-300 outline-none focus:outline-none focus:border-synthwave-neon-cyan focus:bg-synthwave-bg-primary/40 focus:ring-2 focus:ring-synthwave-neon-cyan/20 hover:border-synthwave-neon-cyan/40 hover:bg-synthwave-bg-primary/40",

  // Coach notes section - Styled exactly like workout description container (matches TodaysWorkoutCard phase subcontainer)
  coachNotesSection: "bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg px-4 py-4",

  // Modern delete modal container - 2025 glassmorphism with red destructive theming
  deleteModal: "bg-gradient-to-br from-red-500/10 via-synthwave-bg-card/40 to-red-400/10 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/20 transition-all duration-300",

  // Modern success modal container - 2025 glassmorphism with cyan success theming
  successModal: "bg-gradient-to-br from-synthwave-neon-cyan/10 via-synthwave-bg-card/40 to-synthwave-neon-cyan/10 backdrop-blur-xl border border-synthwave-neon-cyan/30 rounded-2xl shadow-2xl shadow-synthwave-neon-cyan/20 transition-all duration-300",

  // Minimal Card - Exact "Minimal Card" from Theme.jsx with colored dots and hover effects
  cardMinimal: "bg-synthwave-bg-card/20 hover:bg-synthwave-bg-card/40 border-0 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-synthwave-neon-pink/10",

  // Auth Form Container - Opaque glassmorphism for scrollable auth forms (prevents white bleed on mobile)
  authForm: "bg-gradient-to-br from-synthwave-bg-card/90 to-synthwave-bg-card/80 backdrop-blur-xl border border-synthwave-neon-cyan/15 rounded-2xl shadow-2xl shadow-synthwave-neon-cyan/10 hover:from-synthwave-bg-card/95 hover:to-synthwave-bg-card/85 hover:border-synthwave-neon-cyan/20 hover:shadow-2xl hover:shadow-synthwave-neon-cyan/15 transition-all duration-300",

  // Subcontainer Enhanced - Matches Theme.jsx "Option 2: Enhanced Glassmorphism" subcontainer (no border)
  subcontainerEnhanced: "bg-synthwave-bg-primary/25 backdrop-blur-sm rounded-xl p-3",

  // Empty State Tip Card - For tutorial/help cards in empty states (cyan themed, no hover)
  emptyStateTipCard: "bg-synthwave-bg-primary/30 border border-synthwave-neon-cyan/20 rounded-lg px-4 py-4 font-rajdhani"
};

export const toastPatterns = {
  // Modern 2025 gradient toast notifications with glassmorphism
  success: "bg-gradient-to-br from-green-500/20 via-synthwave-neon-cyan/10 to-green-400/20 border border-green-500/40 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg shadow-green-500/20 text-green-400",

  error: "bg-gradient-to-br from-red-500/20 via-synthwave-neon-pink/10 to-red-400/20 border border-red-500/40 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg shadow-red-500/20 text-red-400",

  warning: "bg-gradient-to-br from-yellow-500/20 via-synthwave-neon-purple/10 to-yellow-400/20 border border-yellow-500/40 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg shadow-yellow-500/20 text-yellow-400",

  info: "bg-gradient-to-br from-synthwave-neon-cyan/20 via-synthwave-neon-purple/10 to-synthwave-neon-pink/20 border border-synthwave-neon-cyan/40 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg shadow-synthwave-neon-cyan/20 text-synthwave-neon-cyan"
};

// Base tooltip style object for reuse
const baseTooltipStyle = {
  backgroundColor: '#000000',
  color: '#ffffff',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'Rajdhani, sans-serif',
  padding: '8px 12px',
  zIndex: 99999
};

export const tooltipPatterns = {
  // Standard tooltip configuration - consistent across the entire application
  // Use with react-tooltip: <Tooltip {...tooltipPatterns.standard} />
  standard: {
    offset: 8,
    delayShow: 0,
    style: baseTooltipStyle
  },

  // Standard tooltip props for data attributes
  // Use with elements: data-tooltip-id="my-tooltip" {...tooltipPatterns.dataProps}
  dataProps: {
    'data-tooltip-offset': 8,
    'data-tooltip-delay-show': 0
  },

  // Custom positioning variants (extend standard with transform)
  standardLeft: {
    offset: 8,
    delayShow: 0,
    style: {
      ...baseTooltipStyle,
      transform: 'translateX(-8px)'
    }
  },

  standardRight: {
    offset: 8,
    delayShow: 0,
    style: {
      ...baseTooltipStyle,
      transform: 'translateX(8px)'
    }
  }
};

export const layoutPatterns = {
  // Page containers
  pageContainer: "bg-synthwave-gradient min-h-screen text-synthwave-text-primary",

  // Content wrappers
  contentWrapper: "max-w-7xl mx-auto px-8 py-8",

  // Grid layouts
  cardGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto",

  // Hero sections
  hero: "relative overflow-hidden py-24 px-8 text-center bg-synthwave-gradient before:absolute before:inset-0 before:bg-gradient-to-br before:from-synthwave-neon-pink/10 before:via-transparent before:to-synthwave-neon-cyan/10 before:pointer-events-none",

  // Auth background - simple gradient without pseudo-elements
  authBackground: "bg-gradient-to-br from-synthwave-bg-primary via-synthwave-bg-tertiary to-synthwave-bg-purple"
};

export const messagePatterns = {
  // Message status indicator dots - show message state/mode
  // Primary dot (full opacity)
  statusDotPrimary: "w-3 h-3 rounded-full",
  // Secondary dot (reduced opacity for visual hierarchy)
  statusDotSecondary: "w-3 h-3 rounded-full opacity-60",

  // Color variants for status dots
  statusDotCyan: "bg-synthwave-neon-cyan",
  statusDotPink: "bg-synthwave-neon-pink",
  statusDotPurple: "bg-synthwave-neon-purple",
};

export const avatarPatterns = {
  // Small avatars (text-sm) - for navigation and chat bubbles
  small: "font-russo font-bold text-sm",

  // Large avatars (text-lg) - for coach headers and prominent displays
  large: "font-russo font-bold text-lg",

  // Complete avatar containers with styling
  userSmall: "w-8 h-8 bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple rounded-full flex items-center justify-center text-white font-russo font-bold text-sm shadow-lg shadow-synthwave-neon-pink/20 ring-2 ring-synthwave-neon-pink/30",

  aiSmall: "w-8 h-8 bg-gradient-to-br from-synthwave-neon-cyan to-synthwave-neon-pink rounded-full flex items-center justify-center text-white font-russo font-bold text-sm shadow-lg shadow-synthwave-neon-cyan/20 ring-2 ring-synthwave-neon-cyan/30",

  coachLarge: "w-12 h-12 bg-gradient-to-br from-synthwave-neon-cyan to-synthwave-neon-pink rounded-full flex items-center justify-center text-white font-russo font-bold text-lg shadow-xl shadow-synthwave-neon-cyan/30 ring-2 ring-synthwave-neon-cyan/30",

  // Compact avatar (24px) - for compact header displays
  coachCompact: "w-6 h-6 bg-gradient-to-br from-synthwave-neon-cyan to-synthwave-neon-pink rounded-full flex items-center justify-center text-white font-russo font-bold text-xs shadow-lg shadow-synthwave-neon-cyan/20 ring-2 ring-synthwave-neon-cyan/30",

  // Skeleton loading states for avatars
  skeletonSmall: "w-8 h-8 bg-synthwave-text-muted/20 rounded-full animate-pulse",

  skeletonLarge: "w-12 h-12 bg-synthwave-text-muted/20 rounded-full animate-pulse"
};

// Compact Card Patterns - Specialized pill-shaped interactive elements
// Used for compact displays in headers and navigation
export const compactCardPatterns = {
  // Coach pill - Horizontal compact coach display with online status
  // Features: 24px avatar, first name only, inline status indicator
  coachPill: "flex items-center gap-2.5 px-3 py-2 bg-synthwave-neon-cyan/5 border border-synthwave-neon-cyan/20 rounded-full cursor-pointer transition-all duration-300 hover:bg-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/40 hover:shadow-lg hover:shadow-synthwave-neon-cyan/20 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary",

  // Avatar container within pill (relative positioning for status badge)
  coachPillAvatar: "relative flex-shrink-0",

  // Online status badge (positioned on avatar)
  coachPillStatusBadge: "absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-synthwave-bg-primary rounded-full flex items-center justify-center",

  // Status dot animation (inside badge)
  coachPillStatusDot: "w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse",

  // Coach info container (horizontal layout for name + status)
  coachPillInfo: "flex items-center gap-2 min-w-0",

  // Coach name text
  coachPillName: "font-rajdhani font-semibold text-white text-base",

  // Online status text container
  coachPillStatus: "flex items-center gap-1.5 text-xs text-synthwave-neon-cyan font-rajdhani",

  // Inline status indicator dot
  coachPillStatusIndicator: "w-2 h-2 bg-green-400 rounded-full animate-pulse"
};

// Command Palette Patterns - Quick action buttons and command interfaces
export const commandPalettePatterns = {
  // Command palette trigger button - Minimal button showing just keyboard shortcut (hidden on mobile via component)
  triggerButton: "flex items-center justify-center px-3 py-2 bg-synthwave-bg-card/50 border border-synthwave-neon-cyan/10 rounded-lg text-synthwave-text-secondary hover:text-synthwave-neon-cyan hover:border-synthwave-neon-cyan/30 hover:bg-synthwave-bg-card/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary",

  // Button text (hidden on mobile)
  triggerButtonText: "font-rajdhani text-sm font-medium hidden sm:inline",

  // Keyboard shortcut badge (button itself is hidden on mobile via CommandPaletteButton component)
  triggerButtonKbd: "px-2 py-1 bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/10 rounded text-xs font-mono text-synthwave-text-muted font-medium"
};

// Navigation Patterns - Color schemes and states for navigation items
export const navigationPatterns = {
  // Navigation item color schemes by semantic color
  colors: {
    pink: {
      active: "text-synthwave-neon-pink",
      inactive: "text-synthwave-text-muted hover:text-synthwave-neon-pink",
      border: "border-synthwave-neon-pink",
      bg: "bg-synthwave-neon-pink/10",
      glow: "drop-shadow-[0_0_8px_rgba(255,0,128,0.5)]",
      shadow: "shadow-[0_0_8px_rgba(255,0,128,0.6)]"
    },
    cyan: {
      active: "text-synthwave-neon-cyan",
      inactive: "text-synthwave-text-muted hover:text-synthwave-neon-cyan",
      border: "border-synthwave-neon-cyan",
      bg: "bg-synthwave-neon-cyan/10",
      glow: "drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]",
      shadow: "shadow-[0_0_8px_rgba(0,255,255,0.6)]"
    },
    purple: {
      active: "text-synthwave-neon-purple",
      inactive: "text-synthwave-text-muted hover:text-synthwave-neon-purple",
      border: "border-synthwave-neon-purple",
      bg: "bg-synthwave-neon-purple/10",
      glow: "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]",
      shadow: "shadow-[0_0_8px_rgba(139,92,246,0.6)]"
    }
  },

  // Mobile Bottom Navigation - Thumb-friendly navigation bar (< 768px)
  mobile: {
    // Bottom nav container - fixed at bottom with glassmorphism
    container: "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-synthwave-bg-card/95 backdrop-blur-xl border-t border-synthwave-neon-cyan/20 shadow-[0_-4px_24px_rgba(0,255,255,0.1)]",

    // Nav item container - flex wrapper for items
    itemsContainer: "flex items-center justify-around",

    // Nav item button - base styles for navigation items (64px for comfortable thumb reach)
    item: "flex flex-col items-center justify-center gap-1 flex-1 py-3 px-1 relative min-h-[64px] focus:outline-none active:outline-none border-0 transition-[background-color,color,transform] duration-300",

    // Active item background - subtle darker tint for contrast against card background
    // Uses primary background color (darker) to create visible differentiation
    // Combine with activeBar and icon glow for complete active state
    // Usage: bg-synthwave-bg-primary/40
    itemActiveBg: "bg-synthwave-bg-primary/30",

    // Nav item label - uppercase tracking for modern look
    label: "text-xs uppercase tracking-wide font-rajdhani",

    // Badge indicator - notification count
    badge: "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold flex items-center justify-center bg-synthwave-neon-pink text-white",

    // Active indicator bar - top border showing active state (primary visual indicator)
    activeBar: "absolute top-0 left-0 right-0 h-1 rounded-b-full bg-gradient-to-r",

    // Safe area padding for iPhone notch
    safeArea: "h-[env(safe-area-inset-bottom)]"
  },

  // More Menu (Bottom Sheet) - Slide-up menu for overflow items
  moreMenu: {
    // Backdrop overlay - darkens background
    backdrop: "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in",

    // Menu container - slide-up bottom sheet
    container: "fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto md:hidden bg-synthwave-bg-card/95 backdrop-blur-xl border-t-2 border-synthwave-neon-cyan/30 rounded-t-3xl shadow-[0_-8px_32px_rgba(0,255,255,0.2)] animate-slide-up synthwave-scrollbar-cyan",

    // Handle bar - visual affordance for dragging
    handleBar: "w-12 h-1.5 bg-synthwave-text-muted/30 rounded-full",

    // Menu header
    header: "px-6 py-4 border-b border-synthwave-neon-cyan/10",
    headerTitle: "font-russo font-bold text-2xl text-white uppercase",
    headerCloseButton: "p-2 rounded-lg text-synthwave-text-muted hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50",

    // Section headers
    sectionContainer: "py-2",
    sectionHeader: "px-6 py-3",
    sectionTitle: "font-rajdhani font-semibold text-sm text-synthwave-text-muted uppercase tracking-wider",

    // Menu items
    item: "w-full flex items-center gap-4 px-6 py-4 focus:outline-none active:outline-none border-0 transition-[background-color,color,transform] duration-300",
    itemLabel: "text-lg font-rajdhani uppercase tracking-wide flex-1 text-left",
    itemBadge: "absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1.5 rounded-full text-xs font-bold flex items-center justify-center bg-synthwave-neon-pink text-white",
    itemActiveIndicator: "w-1 h-8 rounded-full",
    itemChevron: "w-5 h-5 opacity-50",

    // Safe area padding (includes bottom nav height)
    safeArea: "h-[calc(env(safe-area-inset-bottom)+64px)]"
  },

      // Desktop Sidebar Navigation - Persistent left sidebar (≥ 768px)
      desktop: {
        // Sidebar container - fixed left, full height with glassmorphism
        container: "hidden md:flex md:flex-col fixed left-0 top-0 h-screen bg-synthwave-bg-card/95 backdrop-blur-xl border-r border-synthwave-neon-cyan/20 shadow-[4px_0_24px_rgba(0,255,255,0.1)] z-40 transition-all duration-300 ease-in-out",
        containerExpanded: "w-64",
        containerCollapsed: "w-16",

    // Sidebar sections wrapper
    innerContainer: "flex flex-col h-full overflow-hidden",

    // Logo/Brand section at top
    brandSection: "flex items-center justify-center gap-3 px-3 py-3",
    brandLogo: "w-10 h-10 flex-shrink-0",
    brandText: "flex flex-col",
    brandTitle: "font-russo font-bold text-xl text-white uppercase leading-tight",
    brandSubtitle: "font-rajdhani text-xs text-synthwave-text-muted uppercase tracking-wider",

    // Navigation section - scrollable middle area
    navSection: "flex-1 overflow-y-auto py-4 synthwave-scrollbar-cyan",

    // Section headers (e.g., "Primary", "Your Training", "Account")
    sectionHeader: "px-3 py-2 mb-1",
    sectionTitle: "font-rajdhani font-semibold text-xs text-synthwave-text-secondary uppercase tracking-wider",

    // Navigation items
    navItemsContainer: "space-y-1 mb-6",
    navItem: "w-full flex items-center gap-3 px-4 py-2 focus:outline-none active:outline-none relative border-t border-b border-transparent transition-all duration-150",
    navItemIcon: "w-5 h-5 flex-shrink-0",
    navItemLabel: "font-rajdhani font-medium text-base",
    navItemBadge: "ml-auto min-w-[20px] h-5 px-2 rounded-full text-xs font-bold flex items-center justify-center bg-synthwave-neon-pink text-white",
    navItemChevron: "ml-auto w-4 h-4 opacity-50",

    // Active indicator - left border on active items
    activeIndicator: "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full",

    // User profile section at bottom
    profileSection: "px-4 py-2 border-t border-synthwave-neon-cyan/10 bg-synthwave-bg-card/50",
    profileButton: "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 hover:bg-synthwave-bg-card/60 focus:outline-none",
    profileAvatar: "w-10 h-10 rounded-full bg-gradient-to-br from-synthwave-neon-cyan to-synthwave-neon-pink flex items-center justify-center text-white font-russo font-bold text-sm shadow-lg ring-2 ring-synthwave-neon-cyan/30",
    profileInfo: "flex-1 min-w-0",
    profileName: "font-rajdhani font-semibold text-base text-white truncate",
    profileEmail: "font-rajdhani text-xs text-synthwave-text-muted truncate",
    profileChevron: "w-5 h-5 text-synthwave-text-muted",

        // Collapse/expand toggle button
        collapseButton: "absolute top-[36px] -right-3 w-6 h-6 bg-synthwave-bg-card border border-synthwave-neon-cyan/30 rounded-full flex items-center justify-center text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/60 hover:shadow-[0_0_8px_rgba(0,255,255,0.4)] transition-all duration-300 shadow-lg cursor-pointer focus:outline-none z-50",
        collapseIcon: "w-4 h-4 transition-transform duration-300",
        collapseIconRotated: "rotate-180",

        // Collapsed state overrides
        brandSectionCollapsed: "justify-center px-1 py-2",
        brandLogoCollapsed: "w-8 h-8",
        brandTextCollapsed: "hidden",
        navItemCollapsed: "justify-center px-2 py-2.5",
        navItemIconCollapsed: "w-6 h-6",
        navItemLabelCollapsed: "hidden",
        navItemBadgeCollapsed: "absolute -top-1 -right-1",
        profileButtonCollapsed: "justify-center px-2",
        profileAvatarCollapsed: "w-8 h-8",
        profileInfoCollapsed: "hidden",
        profileChevronCollapsed: "hidden",
        sectionHeaderCollapsed: "hidden"
  },

  // Quick Actions FAB - Floating Action Button for mobile quick actions
  fab: {
    // Main FAB button - bottom-right floating button (Hero gradient + FAB structure from Theme.jsx)
    // Position: 64px bottom nav + 16px gap + safe area = calc(80px + env(safe-area-inset-bottom))
    // Using calc() with safe-area-inset-bottom keeps FAB stable when mobile browser chrome hides/shows
    container: "fixed right-6 z-50 md:hidden",
    containerStyle: { bottom: 'calc(80px + env(safe-area-inset-bottom))' }, // Inline style for calc() support
    button: "w-14 h-14 bg-gradient-to-r from-synthwave-neon-pink to-synthwave-neon-purple text-white rounded-full shadow-lg shadow-synthwave-neon-pink/30 hover:shadow-xl hover:shadow-synthwave-neon-pink/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary",
    icon: "w-6 h-6",

    // Speed dial menu - expands above FAB (right-aligned, shifted left with padding)
    // pr-3 adds right padding to shift items left while maintaining right alignment
    speedDial: "absolute bottom-16 right-0 flex flex-col-reverse gap-2 mb-2 pr-1",

    // Speed dial item - wrapper button (minimal styling, hover on children)
    speedDialItem: "flex items-center gap-3 justify-end transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-pink/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary rounded-full",

    // Speed dial icon button (receives hover effects) - PINK themed
    speedDialButton: "w-12 h-12 bg-synthwave-bg-card/95 backdrop-blur-xl border border-synthwave-neon-pink/30 text-synthwave-neon-pink rounded-full shadow-lg hover:shadow-xl hover:shadow-synthwave-neon-pink/40 hover:scale-110 hover:border-synthwave-neon-pink/50 active:scale-95 active:shadow-md transition-all duration-200 flex items-center justify-center",
    speedDialIcon: "w-5 h-5",

    // Speed dial label (receives hover effects) - PINK themed
    speedDialLabel: "bg-synthwave-bg-card/95 backdrop-blur-xl border border-synthwave-neon-pink/20 px-3 py-2 rounded-lg text-synthwave-text-primary font-rajdhani font-medium text-sm shadow-lg hover:bg-synthwave-bg-card hover:border-synthwave-neon-pink/30 hover:shadow-xl hover:shadow-synthwave-neon-pink/20 transition-all duration-200 whitespace-nowrap",

    // Backdrop when speed dial is open
    backdrop: "fixed inset-0 z-40 bg-black/25 backdrop-blur-sm md:hidden animate-fade-in"
  },

  // Quick Prompts Submenu - Context-aware prompt suggestions
  quickPrompts: {
    // Submenu container - mobile: fixed centered, desktop: absolute to right
    container: "fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+360px)] w-[90vw] md:absolute md:left-full md:translate-x-0 md:bottom-0 md:w-[32rem] md:-ml-1 z-60 max-h-[32rem] overflow-y-auto",

    // Category header
    categoryHeader: "px-4 py-1 text-synthwave-neon-cyan font-rajdhani font-semibold text-sm uppercase tracking-wide",

    // Prompt button
    promptButton: "block w-full text-left px-4 py-1.5 font-rajdhani text-base text-synthwave-text-primary hover:text-white hover:bg-synthwave-bg-primary/30 transition-all duration-200 leading-relaxed"
  },

  // Utility Flyout Menu - Hover-based slide-out menu for utility navigation items
  utilityFlyout: {
    // Flyout container - matches sidebar styling with cyan theme
    container: "w-64 bg-synthwave-bg-card border border-synthwave-neon-cyan/20 shadow-[4px_0_24px_rgba(0,255,255,0.1)]",

    // Flyout header section
    header: "px-4 py-3 border-b border-synthwave-neon-cyan/10",
    headerTitle: "font-russo font-bold text-base text-white uppercase tracking-wider",

    // Menu items container
    itemsContainer: "py-2"
  },

  // Dividers - Reusable separator patterns
  dividers: {
    // Gradient fade divider (cyan themed)
    gradientCyan: "h-px bg-gradient-to-r from-transparent via-synthwave-neon-cyan/30 to-transparent",

    // Gradient fade divider (pink themed)
    gradientPink: "h-px bg-gradient-to-r from-transparent via-synthwave-neon-pink/30 to-transparent",

    // Gradient fade divider (purple themed)
    gradientPurple: "h-px bg-gradient-to-r from-transparent via-synthwave-neon-purple/30 to-transparent"
  },

  // Section spacing - Consistent spacing for navigation sections
  sectionSpacing: {
    top: "mt-3",
    bottom: "mb-3",
    both: "mt-3 mb-3"
  }
};

// Quick Stats Patterns - Compact metrics display with icon + number
// Linear/Figma-inspired pattern for displaying key statistics
// Icon-only format with rich tooltips for context
export const quickStatsPatterns = {
  // Outer container - wraps and positions stats below header
  // Negative margin pulls stats closer to header for tighter spacing
  container: "flex flex-wrap items-center gap-3 md:gap-4 mb-6 -mt-4",

  // Individual stat item - icon + number grouping
  item: "flex items-center gap-2 group cursor-help",

  // Icon containers with color variants (matches existing neon colors)
  iconContainer: {
    pink: "p-1.5 bg-synthwave-neon-pink/10 text-synthwave-neon-pink hover:bg-synthwave-neon-pink/20 rounded-lg transition-all duration-200",
    cyan: "p-1.5 bg-synthwave-neon-cyan/10 text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 rounded-lg transition-all duration-200",
    purple: "p-1.5 bg-synthwave-neon-purple/10 text-synthwave-neon-purple hover:bg-synthwave-neon-purple/20 rounded-lg transition-all duration-200"
  },

  // Icon size (16x16px - balanced size for visibility and hierarchy)
  icon: "w-4 h-4",

  // Value display - large number
  value: "text-xl font-rajdhani font-bold text-white group-hover:scale-105 transition-transform duration-200",

  // Skeleton loading states (matches optimized sizing: 16px icons, 6px padding, -16px margin)
  skeleton: {
    container: "flex flex-wrap items-center gap-3 md:gap-4 mb-6 -mt-4",
    item: "flex items-center gap-2",
    icon: "w-7 h-7 bg-synthwave-text-muted/20 rounded-lg animate-pulse", // 28px total (16px icon + 6px padding on each side)
    value: "h-6 w-8 bg-synthwave-text-muted/20 rounded animate-pulse"
  }
};

export const typographyPatterns = {
  // Headings (Russo font - original patterns)
  heroTitle: "font-russo font-black text-5xl md:text-6xl lg:text-7xl text-white mb-8 drop-shadow-lg uppercase",
  pageTitle: "font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase",
  sectionTitle: "font-russo font-bold text-2xl md:text-3xl text-white mb-4 uppercase",
  cardTitle: "font-russo font-bold text-xl text-white uppercase",

  // Inter font headings (for About and content-heavy pages)
  pageTitleInter: "font-inter font-black text-4xl md:text-5xl text-white mb-6",
  sectionTitleInter: "font-inter font-bold text-2xl md:text-3xl text-white mb-4",
  cardTitleInter: "font-inter font-bold text-xl text-white",
  subheadingInter: "font-inter font-semibold text-lg text-white",

  // Body text
  heroSubtitle: "font-rajdhani text-3xl text-synthwave-text-secondary mb-6",
  description: "font-rajdhani text-lg text-synthwave-text-secondary leading-relaxed",
  cardText: "font-rajdhani text-synthwave-text-secondary leading-relaxed",
  caption: "font-rajdhani text-sm text-synthwave-text-muted",

  // Empty state and tip card typography
  emptyStateHeader: "font-russo text-2xl text-white uppercase tracking-wider",
  emptyStateDescription: "font-rajdhani text-base text-synthwave-text-secondary max-w-md",
  emptyStateSectionHeader: "font-rajdhani text-sm text-synthwave-text-secondary uppercase font-semibold mb-3",
  emptyStateCardTitle: "font-semibold text-base text-white mb-1",
  emptyStateCardText: "text-sm text-synthwave-text-secondary",
  emptyStateCardTextWithMargin: "text-sm text-synthwave-text-secondary mb-3",
  emptyStateProTip: "font-rajdhani text-sm text-synthwave-text-muted italic",

  // Code/inline code styling
  inlineCode: "font-mono text-xs text-synthwave-neon-cyan bg-synthwave-bg-primary/50 border border-synthwave-neon-cyan/30 px-2 py-1 rounded inline-block"
};

export const scrollbarPatterns = {
  // Neon Cyan scrollbar - for command palette, content previews, and secondary interfaces
  cyan: "custom-scrollbar-cyan",

  // Neon Pink scrollbar - for chat inputs and primary content areas
  pink: "custom-scrollbar-pink"
};

// Changelog List Patterns - Text-based information display in lists
// Used for displaying version history, updates, and structured text content
// These patterns follow modern UI/UX best practices for scannable, clickable list items
export const changelogListPatterns = {
  // Container for the list of versions
  container: "space-y-2",

  // Individual version item - clickable with hover effects
  versionItem: "group flex items-center justify-between px-4 py-3 bg-synthwave-bg-card/20 hover:bg-synthwave-bg-card/40 border border-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan/30 rounded-lg transition-all duration-200 cursor-pointer",

  // Version text (left side)
  versionText: "font-rajdhani text-base text-synthwave-text-primary group-hover:text-synthwave-neon-cyan transition-colors duration-200",

  // Change count badge (right side) - subtle pill showing total changes
  changeBadge: "px-3 py-1 bg-synthwave-neon-cyan/10 group-hover:bg-synthwave-neon-cyan/20 text-synthwave-neon-cyan text-sm font-rajdhani font-medium rounded-full transition-all duration-200",

  // Date text - muted secondary text
  dateText: "font-rajdhani text-sm text-synthwave-text-muted",

  // Version and date wrapper (for vertical stacking if needed)
  versionInfo: "flex flex-col gap-0.5",

  // Icon for external link indicator (optional)
  linkIcon: "w-4 h-4 text-synthwave-text-muted group-hover:text-synthwave-neon-cyan opacity-0 group-hover:opacity-100 transition-all duration-200"
};

// Scrollbar Styles - Modern neon scrollbars for different UI contexts
export const scrollbarStyles = `
  /* Neon Cyan Scrollbar - for command palette, content previews, and secondary interfaces */
  .custom-scrollbar-cyan::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar-cyan::-webkit-scrollbar-track {
    background: rgba(21, 23, 35, 0.5);
  }
  .custom-scrollbar-cyan::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.3);
    border-radius: 3px;
  }
  .custom-scrollbar-cyan::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 255, 0.5);
  }

  /* Neon Pink Scrollbar - for chat inputs and primary content areas */
  .custom-scrollbar-pink::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar-pink::-webkit-scrollbar-track {
    background: rgba(21, 23, 35, 0.5);
  }
  .custom-scrollbar-pink::-webkit-scrollbar-thumb {
    background: rgba(255, 20, 147, 0.3);
    border-radius: 3px;
  }
  .custom-scrollbar-pink::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 20, 147, 0.5);
  }
`;

// Autofill Override CSS - Nuclear-level browser autofill styling prevention
// Use this CSS in <style> tags or CSS files to completely override browser autofill behavior
export const autofillOverrideStyles = `
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  textarea:-webkit-autofill,
  textarea:-webkit-autofill:hover,
  textarea:-webkit-autofill:focus {
    padding: 12px 16px !important;
    border: 1px solid rgba(236, 72, 153, 0.2) !important;
    border-radius: 12px !important;
    box-shadow: 0 0 0 1000px rgba(15, 23, 42, 0.47) inset !important;
    -webkit-box-shadow: 0 0 0 1000px rgba(15, 23, 42, 0.47) inset !important;
    background: rgba(15, 23, 42, 0.47) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: #f1f5f9 !important;
    min-height: 48px !important;
    height: auto !important;
    outline: none !important;
  }

  /* Error state variant */
  .input-error input:-webkit-autofill,
  .input-error input:-webkit-autofill:hover,
  .input-error input:-webkit-autofill:focus,
  .input-error textarea:-webkit-autofill,
  .input-error textarea:-webkit-autofill:hover,
  .input-error textarea:-webkit-autofill:focus {
    border: 1px solid rgb(248, 113, 113) !important;
  }
`;

// Helper function to inject scrollbar styles into a component
export const injectScrollbarStyles = () => {
  // Check if styles are already injected
  if (document.getElementById('scrollbar-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'scrollbar-styles';
  style.textContent = scrollbarStyles;
  document.head.appendChild(style);
};

// Helper function to inject autofill override styles into a component
export const injectAutofillStyles = () => {
  // Check if styles are already injected
  if (document.getElementById('autofill-override-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'autofill-override-styles';
  style.textContent = autofillOverrideStyles;
  document.head.appendChild(style);
};

// Heat Map Patterns - Unified day cell styling for training program calendars and weekly heat maps
export const heatMapPatterns = {
  // Day cell container - base styles for all day squares
  dayCell: "w-12 h-12 rounded-lg border-2 transition-all duration-300 flex items-center justify-center relative group cursor-pointer",

  // Day cell with hover effects (for workout days)
  dayCellInteractive: "hover:scale-110 hover:shadow-lg transition-all duration-300",

  // Day cell without hover effects (for rest days)
  dayCellStatic: "cursor-default",

  // Status-based background colors
  status: {
    // Completed workouts - pink/green
    completed: "bg-synthwave-neon-pink/60 border-synthwave-neon-pink/70 hover:bg-synthwave-neon-pink/80",

    // Skipped workouts - cyan
    skipped: "bg-synthwave-neon-cyan/60 border-synthwave-neon-cyan/70 hover:bg-synthwave-neon-cyan/80",

    // Partial completion - purple
    partial: "bg-synthwave-neon-purple/60 border-synthwave-neon-purple/70 hover:bg-synthwave-neon-purple/80",

    // Pending/scheduled - subtle secondary
    pending: "bg-synthwave-bg-secondary/50 border-synthwave-neon-cyan/30 hover:bg-synthwave-bg-secondary/70 hover:border-synthwave-neon-cyan/50",

    // Rest day - muted
    rest: "bg-yellow-500/30 border-yellow-500/50 hover:bg-yellow-500/40",

    // RPE-based color scale for completed workouts
    rpe: {
      missing: "bg-yellow-500/30 border-yellow-500/50 hover:bg-yellow-500/40",
      low: "bg-yellow-400/60 border-yellow-400/70 hover:bg-yellow-400/80",
      medium: "bg-orange-500/60 border-orange-500/70 hover:bg-orange-500/80",
      high: "bg-synthwave-neon-pink/60 border-synthwave-neon-pink/70 hover:bg-synthwave-neon-pink/80",
      highest: "bg-purple-600/60 border-purple-600/70 hover:bg-purple-600/80"
    }
  },

  // Workout count indicator (number displayed in cell)
  workoutCount: "text-xs font-bold text-white drop-shadow-lg",

  // Glow effect overlay
  glowOverlay: "absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300",

  // Current day indicator (pulsing dot)
  currentDayIndicator: "absolute -top-1 -right-1 w-3 h-3 bg-synthwave-neon-pink rounded-full animate-pulse"
};

// Usage Examples:
// Buttons:
// <button className={buttonPatterns.primary}>Create New</button>
//
// Form Patterns:
// <label className={formPatterns.label}>Email</label>
// <p className={formPatterns.errorText}>This field is required</p>
// <p className={formPatterns.helperText}>Helper text description</p>
// <h3 className={formPatterns.subsectionHeader}><span>Section Title</span></h3>
//
// Inputs:
// <input className={inputPatterns.standard} placeholder="Enter text..." />
// <textarea className={inputPatterns.textarea} placeholder="Enter message..." />
// <select className={inputPatterns.select}><option>Choice 1</option></select>
// <input type="checkbox" className={inputPatterns.checkbox} />
//
// Containers:
// <div className={containerPatterns.cardMedium}>...</div>
// <div className={containerPatterns.authForm}>Auth form content</div>
// <div className={containerPatterns.dashedCard}>Create action card</div>
// <div className={containerPatterns.dashedCardPinkBold}>Failed state card</div>
// <div className={containerPatterns.dashedCardCyan}>Building state card</div>
// <div className={containerPatterns.dashedCardPurple}>Incomplete state card</div>
// <div className={containerPatterns.emptyStateTipCard}>Empty state tip card</div>
// <div className={toastPatterns.success}>Success message</div>
//
// Typography:
// <h1 className={typographyPatterns.pageTitle}>Page Title</h1>
// <h2 className={typographyPatterns.emptyStateHeader}>Ready to Train?</h2>
// <p className={typographyPatterns.emptyStateDescription}>Description text</p>
// <h4 className={typographyPatterns.emptyStateSectionHeader}>Section Header</h4>
// <h3 className={typographyPatterns.emptyStateCardTitle}>Card Title</h3>
// <p className={typographyPatterns.emptyStateCardText}>Card description</p>
// <code className={typographyPatterns.inlineCode}>/log-workout</code>
//
// Avatars:
// <span className={avatarPatterns.small}>U</span>
// <span className={avatarPatterns.large}>C</span>
// <div className={avatarPatterns.userSmall}>U</div>
// <div className={avatarPatterns.aiSmall}>A</div>
// <div className={avatarPatterns.coachLarge}>C</div>
// <div className={avatarPatterns.coachCompact}>C</div>
// <div className={avatarPatterns.skeletonSmall}></div>
//
// Compact Cards:
// <div className={compactCardPatterns.coachPill}>
//   <div className={compactCardPatterns.coachPillAvatar}>
//     <div className={avatarPatterns.coachCompact}>V</div>
//     <div className={compactCardPatterns.coachPillStatusBadge}>
//       <div className={compactCardPatterns.coachPillStatusDot}></div>
//     </div>
//   </div>
//   <div className={compactCardPatterns.coachPillInfo}>
//     <div className={compactCardPatterns.coachPillName}>Victoria</div>
//     <div className={compactCardPatterns.coachPillStatus}>
//       <div className={compactCardPatterns.coachPillStatusIndicator}></div>
//       <span>online</span>
//     </div>
//   </div>
// </div>
//
// Command Palette:
// <button className={commandPalettePatterns.triggerButton}>
//   <span className={commandPalettePatterns.triggerButtonText}>Quick Actions</span>
//   <kbd className={commandPalettePatterns.triggerButtonKbd}>⌘ + K</kbd>
// </button>
//
// Scrollbars:
// <div className={`overflow-y-auto ${scrollbarPatterns.cyan}`}>Scrollable content</div>
// <div className={`overflow-y-auto ${scrollbarPatterns.pink}`}>Chat content</div>
//
// Tooltips:
// <Tooltip id="my-tooltip" {...tooltipPatterns.standard} />
// <Tooltip id="left-tooltip" {...tooltipPatterns.standardLeft} />
//
// Image Previews:
// <div className={imagePreviewPatterns.grid}>
//   <div className={imagePreviewPatterns.container}>
//     <img className={imagePreviewPatterns.image} src="..." />
//     <button className={imagePreviewPatterns.removeButton}>X</button>
//     <div className={imagePreviewPatterns.sizeLabel}>100KB</div>
//   </div>
// </div>
//
// Call injectScrollbarStyles() in useEffect to enable scrollbar styling
