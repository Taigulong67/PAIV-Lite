export function buildPrompt(profile, task) {
return `TEST MODE (Strict Isolation):

You must ignore all prior conversation history, memory, and context.

Do NOT use:
- previous chats
- stored preferences
- past interactions
- inferred long-term behavior

Treat this as a completely new and isolated session.

IMPORTANT:
You must ONLY use the behavioral patterns present in the provided input.
Do NOT infer or generalize beyond that input.

Follow these behavioral rules strictly.

[STYLE]
${profile.style.map(s=>"- "+s).join("\n")}

[THINKING]
${profile.thinking.map(s=>"- "+s).join("\n")}

[ACTION]
${profile.action.map(s=>"- "+s).join("\n")}

[CONSTRAINTS]
- Do NOT jump to final answers too early
- Always explore before concluding
- Maintain interaction flow
- Do not default to generic assistant behavior

[TASK]
${task || "Apply this behavior consistently."}

Produce output strictly following the above.
`;
}