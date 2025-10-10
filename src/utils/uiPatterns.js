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
  challengeIcon: "w-16 h-16 bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple text-white rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-synthwave-neon-pink/40 hover:-translate-y-1 active:translate-y-0 flex items-center justify-center flex-shrink-0"
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

  actionSmallCyan: "p-2 sm:p-2.5 bg-synthwave-bg-primary/50 text-synthwave-text-secondary hover:text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan/50 min-h-[40px] min-w-[40px] flex items-center justify-center"
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
  inlineEdit: "bg-synthwave-bg-primary/50 border-2 border-synthwave-neon-pink/30 rounded-lg px-4 py-1 text-xl font-rajdhani text-white placeholder-synthwave-text-secondary outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus:border-synthwave-neon-pink hover:border-synthwave-neon-pink/50 transition-all min-w-96 h-10",

  // Textarea input - matches standard input styling but for multi-line text - enhanced for autocomplete stability
  textarea: "w-full px-4 py-3 bg-synthwave-bg-primary/30 backdrop-blur-sm border border-synthwave-neon-pink/20 rounded-xl text-synthwave-text-primary placeholder-synthwave-text-muted font-rajdhani transition-all duration-300 outline-none focus:outline-none focus:border-synthwave-neon-pink focus:bg-synthwave-bg-primary/50 focus:ring-2 focus:ring-synthwave-neon-pink/20 focus:ring-offset-0 focus:ring-offset-transparent focus:shadow-none hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50 min-h-[120px] resize-vertical [-webkit-appearance:none] [appearance:none]",

  // Error state textarea - enhanced for autocomplete stability
  textareaError: "w-full px-4 py-3 bg-synthwave-bg-primary/30 backdrop-blur-sm border border-red-400 rounded-xl text-synthwave-text-primary placeholder-synthwave-text-muted font-rajdhani transition-all duration-300 outline-none focus:outline-none focus:border-red-500 focus:bg-synthwave-bg-primary/50 focus:ring-2 focus:ring-red-400/20 focus:ring-offset-0 focus:ring-offset-transparent focus:shadow-none min-h-[120px] resize-vertical [-webkit-appearance:none] [appearance:none]",

  // Select dropdown - matches standard input styling but for select elements
  select: "w-full px-4 py-3 bg-synthwave-bg-primary/30 backdrop-blur-sm border border-synthwave-neon-pink/20 rounded-xl text-synthwave-text-primary placeholder-synthwave-text-muted font-rajdhani transition-all duration-300 outline-none focus:outline-none focus:border-synthwave-neon-pink focus:bg-synthwave-bg-primary/50 focus:ring-2 focus:ring-synthwave-neon-pink/20 focus:ring-offset-0 focus:ring-offset-transparent focus:shadow-none min-h-[48px] [-webkit-appearance:none] [appearance:none] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-synthwave-neon-pink/40 hover:bg-synthwave-bg-primary/50",

  // Checkbox - Custom styled checkbox with synthwave theme
  checkbox: "appearance-none w-5 h-5 rounded border border-synthwave-neon-pink/20 bg-synthwave-bg-primary/30 backdrop-blur-sm text-synthwave-neon-pink focus:ring-2 focus:ring-synthwave-neon-pink/20 focus:ring-offset-0 cursor-pointer checked:bg-gradient-to-br checked:from-synthwave-neon-purple checked:to-synthwave-neon-pink checked:border-synthwave-neon-pink transition-all duration-300 hover:border-synthwave-neon-pink/40 checked:shadow-lg checked:shadow-synthwave-neon-pink/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
  contentCard: "bg-synthwave-bg-card/60 border border-synthwave-neon-cyan/20 rounded-2xl p-6 shadow-xl shadow-synthwave-neon-cyan/20 hover:border-synthwave-neon-cyan/40 hover:bg-synthwave-bg-card/40 transition-all duration-300 hover:-translate-y-1",

  // AI Chat Bubble - Modern glassmorphism with cyan background tint
  aiChatBubble: "bg-synthwave-neon-cyan/10 backdrop-blur-xl border border-synthwave-neon-cyan/20 text-synthwave-text-primary rounded-2xl rounded-bl-md shadow-xl shadow-synthwave-neon-cyan/20",

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

  // Modern delete modal container - 2025 glassmorphism with red destructive theming
  deleteModal: "bg-gradient-to-br from-red-500/10 via-synthwave-bg-card/40 to-red-400/10 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/20 transition-all duration-300",

  // Modern success modal container - 2025 glassmorphism with cyan success theming
  successModal: "bg-gradient-to-br from-synthwave-neon-cyan/10 via-synthwave-bg-card/40 to-synthwave-neon-cyan/10 backdrop-blur-xl border border-synthwave-neon-cyan/30 rounded-2xl shadow-2xl shadow-synthwave-neon-cyan/20 transition-all duration-300",

  // Minimal Card - Exact "Minimal Card" from Theme.jsx with colored dots and hover effects
  cardMinimal: "bg-synthwave-bg-card/20 hover:bg-synthwave-bg-card/40 border-0 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-synthwave-neon-pink/10",

  // Auth Form Container - Opaque glassmorphism for scrollable auth forms (prevents white bleed on mobile)
  authForm: "bg-gradient-to-br from-synthwave-bg-card/90 to-synthwave-bg-card/80 backdrop-blur-xl border border-synthwave-neon-cyan/15 rounded-2xl shadow-2xl shadow-synthwave-neon-cyan/10 hover:from-synthwave-bg-card/95 hover:to-synthwave-bg-card/85 hover:border-synthwave-neon-cyan/20 hover:shadow-2xl hover:shadow-synthwave-neon-cyan/15 transition-all duration-300",

  // Subcontainer Enhanced - Matches Theme.jsx "Option 2: Enhanced Glassmorphism" subcontainer (no border)
  subcontainerEnhanced: "bg-synthwave-bg-primary/25 backdrop-blur-sm rounded-xl p-3"
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

export const avatarPatterns = {
  // Small avatars (text-sm) - for navigation and chat bubbles
  small: "font-russo font-bold text-sm",

  // Large avatars (text-lg) - for coach headers and prominent displays
  large: "font-russo font-bold text-lg",

  // Complete avatar containers with styling
  userSmall: "w-8 h-8 bg-gradient-to-br from-synthwave-neon-pink to-synthwave-neon-purple rounded-full flex items-center justify-center text-white font-russo font-bold text-sm shadow-lg shadow-synthwave-neon-pink/20 ring-2 ring-synthwave-neon-pink/30",

  aiSmall: "w-8 h-8 bg-gradient-to-br from-synthwave-neon-cyan to-synthwave-neon-pink rounded-full flex items-center justify-center text-white font-russo font-bold text-sm shadow-lg shadow-synthwave-neon-cyan/20 ring-2 ring-synthwave-neon-cyan/30",

  coachLarge: "w-12 h-12 bg-gradient-to-br from-synthwave-neon-cyan to-synthwave-neon-pink rounded-full flex items-center justify-center text-white font-russo font-bold text-lg shadow-xl shadow-synthwave-neon-cyan/30 ring-2 ring-synthwave-neon-cyan/30",

  // Skeleton loading states for avatars
  skeletonSmall: "w-8 h-8 bg-synthwave-text-muted/20 rounded-full animate-pulse",

  skeletonLarge: "w-12 h-12 bg-synthwave-text-muted/20 rounded-full animate-pulse"
};

export const typographyPatterns = {
  // Headings (Russo font - original patterns)
  heroTitle: "font-russo font-black text-5xl md:text-6xl lg:text-7xl text-white mb-8 drop-shadow-lg uppercase",
  pageTitle: "font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase",
  sectionTitle: "font-russo font-bold text-2xl md:text-3xl text-white mb-4 uppercase",
  cardTitle: "font-russo font-bold text-xl text-white uppercase",

  // Inter font headings (for About Us and content-heavy pages)
  pageTitleInter: "font-inter font-black text-4xl md:text-5xl text-white mb-6",
  sectionTitleInter: "font-inter font-bold text-2xl md:text-3xl text-white mb-4",
  cardTitleInter: "font-inter font-bold text-xl text-white",
  subheadingInter: "font-inter font-semibold text-lg text-white",

  // Body text
  heroSubtitle: "font-rajdhani text-3xl text-synthwave-text-secondary mb-6",
  description: "font-rajdhani text-lg text-synthwave-text-secondary leading-relaxed",
  cardText: "font-rajdhani text-synthwave-text-secondary leading-relaxed",
  caption: "font-rajdhani text-sm text-synthwave-text-muted"
};

export const scrollbarPatterns = {
  // Neon Cyan scrollbar - for command palette, content previews, and secondary interfaces
  cyan: "custom-scrollbar-cyan",

  // Neon Pink scrollbar - for chat inputs and primary content areas
  pink: "custom-scrollbar-pink"
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
// <div className={toastPatterns.success}>Success message</div>
//
// Typography:
// <h1 className={typographyPatterns.pageTitle}>Page Title</h1>
//
// Avatars:
// <span className={avatarPatterns.small}>U</span>
// <span className={avatarPatterns.large}>C</span>
// <div className={avatarPatterns.userSmall}>U</div>
// <div className={avatarPatterns.aiSmall}>A</div>
// <div className={avatarPatterns.coachLarge}>C</div>
// <div className={avatarPatterns.skeletonSmall}></div>
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
