/**
 * ContextBuilder — composes the system prompt out of named, ordered sections
 * and emits a `{ staticPrompt, dynamicPrompt }` split so Bedrock prompt
 * caching has a stable cache prefix.
 *
 * Phase 1 — see plan §5.1.
 */

export type SectionName =
  | "role"
  | "personality"
  | "methodology"
  | "tool_rules"
  | "critical_rules"
  | "living_profile"
  | "conversation_summary"
  | "memories"
  | "rag_context"
  | "today_workout_status"
  | "temporal"
  | "turn_metadata"
  | string;

export interface SectionOptions {
  /** When true, the section lives in `staticPrompt` (cached). When false, it
   *  lives in `dynamicPrompt`. */
  cacheable: boolean;
  /** Lower numbers come first within their static/dynamic bucket. */
  order: number;
  /** Optional separator override (defaults to two newlines). */
  separator?: string;
}

interface RegisteredSection {
  name: SectionName;
  content: string;
  opts: SectionOptions;
}

export class ContextBuilder {
  private sections: RegisteredSection[] = [];

  addSection(name: SectionName, content: string, opts: SectionOptions): this {
    if (!content || content.trim().length === 0) return this;
    this.sections.push({ name, content, opts });
    return this;
  }

  /** Replace any previous registration of `name` (most recent wins). */
  setSection(name: SectionName, content: string, opts: SectionOptions): this {
    this.sections = this.sections.filter((s) => s.name !== name);
    return this.addSection(name, content, opts);
  }

  removeSection(name: SectionName): this {
    this.sections = this.sections.filter((s) => s.name !== name);
    return this;
  }

  hasSection(name: SectionName): boolean {
    return this.sections.some((s) => s.name === name);
  }

  build(): { staticPrompt: string; dynamicPrompt: string } {
    const staticSections = this.sections
      .filter((s) => s.opts.cacheable)
      .slice()
      .sort((a, b) => a.opts.order - b.opts.order);
    const dynamicSections = this.sections
      .filter((s) => !s.opts.cacheable)
      .slice()
      .sort((a, b) => a.opts.order - b.opts.order);

    return {
      staticPrompt: this.join(staticSections),
      dynamicPrompt: this.join(dynamicSections),
    };
  }

  private join(sections: RegisteredSection[]): string {
    if (sections.length === 0) return "";
    return sections
      .map((s) => s.content.trimEnd())
      .reduce((acc, content, i) => {
        if (i === 0) return content;
        const sep = sections[i].opts.separator ?? "\n\n";
        return acc + sep + content;
      }, "");
  }
}
