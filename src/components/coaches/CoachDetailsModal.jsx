// CoachDetailsModal.jsx
// Shows full coach configuration details in a scrollable modal.
// Fetches the single-coach endpoint on open so all config fields are available.
// Opened from the coach card kebab menu on the Coaches page.

import React, { useState, useEffect } from "react";
import { containerPatterns } from "../../utils/ui/uiPatterns";

const CloseIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// Thin separator + uppercase section label
const SectionHeader = ({ title }) => (
  <div className="font-rajdhani text-xs text-synthwave-neon-cyan/70 uppercase tracking-widest pt-5 pb-1 first:pt-0 border-t border-synthwave-neon-cyan/10 first:border-t-0">
    {title}
  </div>
);

// Small muted label above a content block (no border, no box)
const FieldLabel = ({ children }) => (
  <div className="font-rajdhani text-xs text-synthwave-text-muted uppercase tracking-wider mb-0.5 mt-3 first:mt-0">
    {children}
  </div>
);

const Tag = ({ children }) => (
  <span className="font-rajdhani text-xs px-2 py-0.5 rounded-md bg-synthwave-neon-cyan/10 border border-synthwave-neon-cyan/20 text-synthwave-neon-cyan">
    {children}
  </span>
);

const Highlight = ({ children }) => (
  <span className="text-synthwave-neon-cyan">{children}</span>
);

const tidyLabel = (str) => {
  if (!str) return "";
  if (Array.isArray(str)) return str.map(tidyLabel).join(", ");
  const s = typeof str === "string" ? str : String(str);
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const LoadingSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-2 w-20 bg-synthwave-neon-cyan/15 rounded-md" />
        <div className="h-4 w-3/4 bg-white/10 rounded-md" />
        <div className="h-3 w-full bg-white/5 rounded-md" />
        <div className="h-3 w-2/3 bg-white/5 rounded-md" />
      </div>
    ))}
  </div>
);

const CoachDetailsModal = ({ isOpen, onClose, coach, userId, agentRef }) => {
  const [fullConfig, setFullConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const coachId = coach?.coach_id;

  useEffect(() => {
    if (!isOpen || !coachId || !userId || !agentRef?.current) {
      setFullConfig(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setFullConfig(null);

    agentRef.current
      .loadCoachDetails(userId, coachId)
      .then((data) => {
        if (!cancelled) {
          setFullConfig(data?.rawCoach?.coachConfig ?? null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load coach details.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, coachId, userId, agentRef]);

  if (!isOpen || !coach) return null;

  const formatName = (name) =>
    agentRef?.current?.formatCoachName
      ? agentRef.current.formatCoachName(name)
      : tidyLabel(name);

  const formatDate = (date) =>
    agentRef?.current?.formatDate
      ? agentRef.current.formatDate(date)
      : date
        ? new Date(date).toLocaleDateString()
        : null;

  const displayName = formatName(coach.coach_name);

  const summaryConversations = coach.metadata?.total_conversations ?? 0;
  const summaryCreatedDate = formatDate(coach.metadata?.created_date);

  const identity = fullConfig;
  const personality = fullConfig?.selected_personality;
  const prompts = fullConfig?.generated_prompts;
  const methodology = fullConfig?.selected_methodology;
  const techConfig = fullConfig?.technical_config;
  const safetyProfile = fullConfig?.metadata?.safety_profile;
  const equipment = safetyProfile?.equipment ?? techConfig?.equipment_available;
  const totalConversations =
    fullConfig?.metadata?.total_conversations ?? summaryConversations;
  const createdDate =
    formatDate(fullConfig?.metadata?.created_date) ?? summaryCreatedDate;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Centering wrapper */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className={`${containerPatterns.successModal} relative w-full max-w-2xl max-h-[85vh] flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky header */}
          <div className="flex items-start justify-between px-7 py-5 border-b border-synthwave-neon-cyan/10 shrink-0">
            <div className="min-w-0 pr-4">
              <h3 className="font-russo font-bold text-lg text-white uppercase truncate">
                {displayName}
              </h3>
              <p className="font-rajdhani text-xs text-synthwave-text-secondary mt-0.5">
                Coach Configuration
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1 text-synthwave-text-muted hover:text-synthwave-neon-pink transition-colors cursor-pointer focus:outline-none"
              aria-label="Close coach details"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto synthwave-scrollbar-cyan px-7 py-5">
            {isLoading && <LoadingSkeleton />}

            {error && (
              <div className="text-center py-8">
                <p className="font-rajdhani text-synthwave-neon-pink text-sm">
                  {error}
                </p>
              </div>
            )}

            {!isLoading && !error && (
              <div>
                {/* ── Identity ── */}
                <SectionHeader title="Identity" />

                <p className="font-rajdhani text-xs text-synthwave-text-secondary leading-relaxed">
                  {createdDate && <>Created {createdDate} &nbsp;·&nbsp; </>}
                  <Highlight>
                    {totalConversations} conversation
                    {totalConversations !== 1 ? "s" : ""}
                  </Highlight>
                </p>

                {identity?.coach_description && (
                  <>
                    <FieldLabel>Description</FieldLabel>
                    <p className="font-rajdhani text-sm text-synthwave-text-secondary leading-relaxed">
                      {identity.coach_description}
                    </p>
                  </>
                )}

                {/* ── Personality & Tone ── */}
                {(personality || prompts) && (
                  <>
                    <SectionHeader title="Personality &amp; Tone" />

                    {personality?.primary_template && (
                      <>
                        <p className="font-rajdhani text-sm text-white font-medium">
                          {tidyLabel(personality.primary_template)}
                        </p>
                        {personality.secondary_influences?.length > 0 && (
                          <p className="font-rajdhani text-xs text-synthwave-text-secondary mt-1 leading-relaxed">
                            Influenced by{" "}
                            <Highlight>
                              {personality.secondary_influences
                                .map(tidyLabel)
                                .join(", ")}
                            </Highlight>
                            {personality.blending_weights && (
                              <>
                                {" "}
                                — Primary{" "}
                                <Highlight>
                                  {(
                                    personality.blending_weights.primary * 100
                                  ).toFixed(0)}
                                  %
                                </Highlight>
                                , Secondary{" "}
                                <span className="text-synthwave-neon-purple">
                                  {(
                                    personality.blending_weights.secondary * 100
                                  ).toFixed(0)}
                                  %
                                </span>
                              </>
                            )}
                          </p>
                        )}
                      </>
                    )}

                    {personality?.selection_reasoning && (
                      <>
                        <FieldLabel>Why this personality</FieldLabel>
                        <p className="font-rajdhani text-sm text-synthwave-text-secondary leading-relaxed">
                          {personality.selection_reasoning}
                        </p>
                      </>
                    )}

                    {prompts?.communication_style && (
                      <>
                        <FieldLabel>Communication style</FieldLabel>
                        <p className="font-rajdhani text-sm text-synthwave-text-secondary leading-relaxed">
                          {prompts.communication_style.slice(0, 300)}
                          {prompts.communication_style.length > 300 ? "…" : ""}
                        </p>
                      </>
                    )}

                    {prompts?.motivation_prompt && (
                      <>
                        <FieldLabel>Motivational approach</FieldLabel>
                        <p className="font-rajdhani text-sm text-synthwave-text-secondary leading-relaxed">
                          {prompts.motivation_prompt.slice(0, 300)}
                          {prompts.motivation_prompt.length > 300 ? "…" : ""}
                        </p>
                      </>
                    )}
                  </>
                )}

                {/* ── Training Methodology ── */}
                {(methodology || techConfig) && (
                  <>
                    <SectionHeader title="Training Methodology" />

                    {methodology?.primary_methodology && (
                      <>
                        <p className="font-rajdhani text-sm text-white font-medium">
                          {tidyLabel(methodology.primary_methodology)}
                        </p>
                        <div className="font-rajdhani text-xs text-synthwave-text-secondary mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                          {methodology.programming_emphasis && (
                            <Highlight>
                              {tidyLabel(methodology.programming_emphasis)}
                            </Highlight>
                          )}
                          {methodology.periodization_approach && (
                            <span>
                              {tidyLabel(methodology.periodization_approach)}{" "}
                              periodization
                            </span>
                          )}
                          {methodology.creativity_emphasis && (
                            <Highlight>
                              {tidyLabel(methodology.creativity_emphasis)}
                            </Highlight>
                          )}
                        </div>
                      </>
                    )}

                    {methodology?.methodology_reasoning && (
                      <>
                        <FieldLabel>Approach rationale</FieldLabel>
                        <p className="font-rajdhani text-sm text-synthwave-text-secondary leading-relaxed">
                          {methodology.methodology_reasoning}
                        </p>
                      </>
                    )}

                    {techConfig && (
                      <>
                        <FieldLabel>Training profile</FieldLabel>
                        <div className="font-rajdhani text-sm text-synthwave-text-secondary space-y-0.5">
                          {techConfig.experience_level && (
                            <p>
                              Experience:{" "}
                              <Highlight>
                                {tidyLabel(techConfig.experience_level)}
                              </Highlight>
                            </p>
                          )}
                          {techConfig.training_frequency && (
                            <p>
                              Frequency:{" "}
                              <Highlight>
                                {techConfig.training_frequency} days / week
                              </Highlight>
                            </p>
                          )}
                          {techConfig.programming_focus && (
                            <p>
                              Focus:{" "}
                              <Highlight>
                                {tidyLabel(techConfig.programming_focus)}
                              </Highlight>
                            </p>
                          )}
                          {techConfig.specializations?.length > 0 && (
                            <p>
                              Specializations:{" "}
                              <Highlight>
                                {techConfig.specializations
                                  .map(tidyLabel)
                                  .join(", ")}
                              </Highlight>
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ── Available Equipment ── */}
                {equipment?.length > 0 && (
                  <>
                    <SectionHeader title="Available Equipment" />
                    <div className="flex flex-wrap gap-1.5">
                      {equipment.map((item, i) => (
                        <Tag key={i}>{tidyLabel(item)}</Tag>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Safety & Limitations ── */}
                {(safetyProfile?.contraindications?.length > 0 ||
                  safetyProfile?.modifications?.length > 0) && (
                  <>
                    <SectionHeader title="Safety &amp; Limitations" />

                    {safetyProfile.contraindications?.length > 0 && (
                      <>
                        <FieldLabel>Contraindications</FieldLabel>
                        <ul className="space-y-0.5">
                          {safetyProfile.contraindications.map((item, i) => (
                            <li
                              key={i}
                              className="font-rajdhani text-sm text-synthwave-text-secondary flex items-start gap-1.5"
                            >
                              <span className="text-synthwave-neon-pink mt-0.5 shrink-0">
                                •
                              </span>
                              {tidyLabel(item)}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {safetyProfile.modifications?.length > 0 && (
                      <>
                        <FieldLabel>Required modifications</FieldLabel>
                        <ul className="space-y-0.5">
                          {safetyProfile.modifications.map((item, i) => (
                            <li
                              key={i}
                              className="font-rajdhani text-sm text-synthwave-text-secondary flex items-start gap-1.5"
                            >
                              <span className="text-synthwave-neon-cyan mt-0.5 shrink-0">
                                •
                              </span>
                              {tidyLabel(item)}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                )}

                {!fullConfig && !isLoading && !error && (
                  <div className="text-center py-8">
                    <p className="font-rajdhani text-synthwave-text-muted text-sm">
                      No configuration details available.
                    </p>
                  </div>
                )}

                <div className="h-4" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CoachDetailsModal;
