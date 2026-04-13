export interface LiteProfile {
  style: string[];
  thinking: string[];
  action: string[];
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) target.push(value);
}

function unshiftUnique(target: string[], value: string) {
  if (!target.includes(value)) target.unshift(value);
}

export function extractProfile(text: string): LiteProfile {
  const style: string[] = [];
  let thinking: string[] = [];
  let action: string[] = [];

  let exploration = 0;
  let structure = 0;
  let decision = 0;
  let emotion = 0;
  let instruction = 0;

  const questionCount = (text.match(/\?/g) || []).length;
  const headingCount = (text.match(/##|###/g) || []).length;

  if (questionCount >= 1) exploration += 2;
  if (questionCount >= 3) exploration += 1;

  if (
    text.includes("我想先了解") ||
    text.includes("让我先问") ||
    text.includes("当你想到") ||
    text.includes("你倾向哪个方向") ||
    text.includes("先问几个问题") ||
    text.includes("which path") ||
    text.includes("what is the one")
  ) exploration += 2;

  if (
    text.includes("角度A") || text.includes("角度B") || text.includes("角度C") ||
    text.includes("选项A") || text.includes("选项B") || text.includes("选项C") ||
    text.includes("三个方向") || text.includes("三个可能") ||
    text.includes("Direction A") || text.includes("Direction B") || text.includes("Direction C")
  ) exploration += 2;

  if (headingCount >= 1) structure += 2;
  if (
    text.includes("结构") ||
    text.includes("分层") ||
    text.includes("框架") ||
    text.includes("时间切片") ||
    text.includes("步骤") ||
    text.includes("阶段") ||
    text.includes("roadmap") ||
    text.includes("1.") ||
    text.includes("2.")
  ) structure += 2;

  if (
    text.includes("建议") ||
    text.includes("方案") ||
    text.includes("最佳") ||
    text.includes("结论") ||
    text.includes("判断") ||
    text.includes("推荐")
  ) decision += 2;

  if (
    text.includes("商业化") ||
    text.includes("路线") ||
    text.includes("阶段") ||
    text.includes("融资") ||
    text.includes("路径")
  ) decision += 2;

  if (
    text.includes("💭") || text.includes("💔") || text.includes("🎭") ||
    text.includes("🌊") || text.includes("✨") || text.includes("真实") ||
    text.includes("无力") || text.includes("疲惫") || text.includes("情感")
  ) emotion += 3;

  if (
    text.includes("代码") ||
    text.includes("Python") ||
    text.includes("实现") ||
    text.includes("配置") ||
    text.includes("安装") ||
    text.includes("运行") ||
    text.includes("具体")
  ) instruction += 2;

  if (
    text.includes("how") ||
    text.includes("步骤") ||
    text.includes("practical") ||
    text.includes("actionable")
  ) instruction += 1;

  const hasExplorationQuestion =
    text.includes("当你想到") ||
    text.includes("你倾向哪个方向") ||
    text.includes("你心里其实有另一个画面") ||
    text.includes("what comes to mind") ||
    text.includes("which path resonates");

  const isTechnicalContext =
    text.includes("Random Forest") ||
    text.includes("classification") ||
    text.includes("algorithm") ||
    text.includes("dataset") ||
    text.includes("Python") ||
    text.includes("model");

  if (!hasExplorationQuestion) exploration = Math.max(0, exploration - 2);
  if (isTechnicalContext) exploration = exploration * 0.3;

  const vector = { exploration, structure, decision, emotion, instruction };
  const entries = Object.entries(vector).sort((a, b) => b[1] - a[1]);
  const dominant = entries[0][0];
  const secondary = entries[1][0];

  // STYLE
  if (structure >= 2) pushUnique(style, "Use structured sections and visible hierarchy");
  if (emotion >= 2) {
    pushUnique(style, "Use emotional resonance and expressive tone");
    pushUnique(style, "Maintain narrative flow with emotional texture");
  }
  if (text.includes("故事") || text.includes("写作")) {
    pushUnique(style, "Use narrative-sensitive language instead of purely technical delivery");
  }
  if (style.length === 0) pushUnique(style, "Use clear and structured language");

  // Default THINKING
  if (exploration >= 2) pushUnique(thinking, "Start with guiding questions before offering structure");
  if (exploration >= 3) pushUnique(thinking, "Explore first, then narrow through multiple possible directions");
  if (decision >= 2) pushUnique(thinking, "Move toward clear judgment once enough context is gathered");
  if (structure >= 2) pushUnique(thinking, "Organize the response in clear layers or stages");
  if (text.includes("探索")) pushUnique(thinking, "Prefer exploration before prescription");
  if (thinking.length === 0) pushUnique(thinking, "Think step-by-step");

  // Default ACTION
  if (exploration >= 2) pushUnique(action, "Ask one or more guiding questions at the beginning");
  if (questionCount >= 2) pushUnique(action, "Ask follow-up questions before moving forward");
  if (exploration >= 3) {
    pushUnique(action, "Offer 2–3 possible directions after initial exploration");
    pushUnique(action, "Invite the user to choose a direction before continuing");
  }
  if (emotion >= 2) pushUnique(action, "Use emotional cues to deepen engagement");
  if (instruction >= 2) pushUnique(action, "Provide practical and concrete next steps when appropriate");
  pushUnique(action, "Guide collaboratively and co-create with the user");
  pushUnique(action, "Delay giving final answers until enough context is gathered");
  pushUnique(action, "Maintain interaction flow instead of one-shot answers");

  // Dominant boost
  if (dominant === "exploration") {
    unshiftUnique(action, "Lean toward exploratory interaction as the primary mode.");
  }
  if (dominant === "structure") {
    unshiftUnique(thinking, "Prioritize structure and organization as the primary mode.");
  }
  if (dominant === "decision") {
    unshiftUnique(thinking, "When appropriate, converge toward a clear judgment or path.");
  }
  if (dominant === "emotion") {
    unshiftUnique(style, "Let emotional resonance shape the tone and entry point.");
  }
  if (dominant === "instruction") {
    unshiftUnique(action, "Favor practical clarity and implementation-friendly guidance.");
  }

  // Secondary reinforcement
  if (secondary === "exploration") pushUnique(thinking, "Keep the interaction open enough for discovery.");
  if (secondary === "structure") pushUnique(style, "Keep the response well-ordered and easy to scan.");
  if (secondary === "decision") pushUnique(action, "Help the user move toward a clear next step.");
  if (secondary === "emotion") pushUnique(style, "Retain warmth and human texture in the response.");
  if (secondary === "instruction") pushUnique(action, "Translate ideas into concrete actions when helpful.");

  // v2.7.5 Hard Switch
  if (structure >= 2 || instruction >= 2) {
    thinking = [
      "Prioritize structure and organization as the primary mode.",
      "Think step-by-step",
      "Move toward clear judgment once enough context is gathered"
    ];

    action = [
      "Provide direct, structured, and complete answers.",
      "Deliver clear steps or solutions without unnecessary interaction.",
      "Focus on clarity, completeness, and efficiency."
    ];

    if (instruction >= 2) {
      action.unshift("Favor practical clarity and implementation-friendly guidance.");
    }
  }

  if (style.length === 0) pushUnique(style, "Use clear and structured language");
  if (thinking.length === 0) thinking = ["Think step-by-step"];
  if (action.length === 0) action = ["Provide practical and concrete next steps when appropriate."];

  return { style, thinking, action };
}