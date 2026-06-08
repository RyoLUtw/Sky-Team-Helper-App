const levels = [
  { key: "trainee", label: "Trainee" },
  { key: "junior", label: "Junior" },
  { key: "senior", label: "Senior" }
];

const blankText = "_____";
const juniorStateKey = "skyTeamHelperJuniorBlankState";
const thrustStateKey = "skyTeamHelperNextThrustVariant";
const thrustLastValueKey = "skyTeamHelperLastThrust";

function k(text, key) {
  return { text, key };
}

function b() {
  return { blank: true };
}

function line(id, tokens, note) {
  return { id, tokens, note };
}

const operations = {
  tower: {
    title: "Contact control tower",
    keywords: ["contact", "control tower", "sight", "request", "heading", "avoid", "traffic", "path", "approach"],
    lines: [
      line("tower-sight", [k("Traffic", "traffic"), " in ", k("sight", "sight"), ". ", k("Contacting", "contact"), " ", k("control tower", "control tower"), "."], "putting die"),
      line("tower-heading", [k("Request", "request"), " ", k("heading", "heading"), " to ", k("avoid", "avoid"), " ", k("traffic", "traffic"), "."], "pointing to target space"),
      line("tower-approach", [k("Path", "path"), " clear for ", k("approach", "approach"), "."], "discard airplane token")
    ]
  },
  gear: {
    title: "Put down landing gear",
    keywords: ["landing", "gear", "require", "thrust", "maintain"],
    lines: [
      line("gear-lowering", ["Lowering ", k("landing", "landing"), " ", k("gear", "gear"), " 1/2/3."], "putting die"),
      line("gear-down", [k("Gear", "gear"), " down."], "green light on"),
      line("gear-thrust", [k("Require", "require"), " higher ", k("thrust", "thrust"), " to ", k("maintain", "maintain"), " speed."], "move blue thrust marker")
    ]
  },
  flaps: {
    title: "Extend wing flaps",
    keywords: ["flaps", "extend", "require", "thrust", "maintain"],
    lines: [
      line("flaps-extending", [k("Extending", "extend"), " ", k("flaps", "flaps"), " 1/2/3/4."], "putting die"),
      line("flaps-extended", [k("Flaps", "flaps"), " ", k("extended", "extend"), "."], "green light on"),
      line("flaps-thrust", [k("Require", "require"), " higher ", k("thrust", "thrust"), " to ", k("maintain", "maintain"), " speed."], "move orange thrust marker")
    ]
  },
  axis: {
    title: "Set axis",
    keywords: ["roll", "axis", "level", "wings", "bank", "mayday"],
    firstLine: line("axis-rolling", [k("Rolling", "roll"), "."], "putting first die"),
    options: [
      {
        key: "tilted",
        label: "tilted",
        line: line("axis-tilted", ["Set ", k("axis", "axis"), " to 30/60 degrees left/right."], "putting second die")
      },
      {
        key: "level",
        label: "horizontal",
        line: line("axis-level", ["Hold ", k("wings", "wings"), " ", k("level", "level"), "."], "putting second die")
      },
      {
        key: "spin",
        label: "spin",
        line: line("axis-spin", [k("Overbanking", "bank"), ". We're losing control! ", k("Mayday", "mayday"), ", ", k("Mayday", "mayday"), ", ", k("Mayday", "mayday"), ", Sky Team 123, control failure, unable to maintain ", k("bank", "bank"), "."], "putting second die")
      }
    ]
  },
  thrust: {
    title: "Set thrust",
    keywords: ["adjust", "engine", "power", "thrust", "increase", "reduce", "set"],
    intro: line("thrust-adjust", [k("Adjusting", "adjust"), " ", k("engine", "engine"), " ", k("power", "power"), "."], "putting first die"),
    toLine: line("thrust-to", [k("Increase", "increase"), "/set or ", k("Reduce", "reduce"), "/set ", k("thrust", "thrust"), " to 2-12."], "putting second die"),
    byLine: line("thrust-by", [k("Increase", "increase"), "/", k("Reduce", "reduce"), " ", k("thrust", "thrust"), " by 1-10."], "putting second die"),
    confirm: line("thrust-confirmed", [k("Thrust", "thrust"), " confirmed."], "moving the distance gauge")
  },
  brakes: {
    title: "Activate brakes",
    keywords: ["apply", "brake"],
    lines: [
      line("brakes-applying", [k("Applying", "apply"), " ", k("brake", "brake"), "."], "putting die"),
      line("brakes-braking", [k("Braking", "brake"), "."], "moving red thrust token")
    ]
  },
  coffee: {
    title: "Request coffee",
    keywords: ["request", "receive", "cabin", "crew"],
    lines: [
      line("coffee-request", [k("Requesting", "request"), " coffee from ", k("cabin", "cabin"), " ", k("crew", "crew"), "."], "putting die"),
      line("coffee-received", ["Coffee ", k("received", "receive"), "."], "adding coffee token")
    ]
  }
};

const slider = document.querySelector("#levelSlider");
const levelName = document.querySelector("#levelName");
const modal = document.querySelector("#helperModal");
const modalTitle = document.querySelector("#modalTitle");
const modalLevel = document.querySelector("#modalLevel");
const modalBody = document.querySelector("#modalBody");
const closeModal = document.querySelector("#closeModal");

let activeOperation = null;
let activeStep = null;
let activeAxisChoice = null;
let activeThrustVariant = "to";
let activeCurrentThrust = loadLastThrustValue();
let activeThrustMax = 12;
let activeBlankChoices = new Map();
let juniorBlankState = loadJuniorBlankState();
let nextThrustVariant = loadNextThrustVariant();
let lastThrustValue = loadLastThrustValue();

function loadJuniorBlankState() {
  try {
    return JSON.parse(localStorage.getItem(juniorStateKey)) || {};
  } catch {
    return {};
  }
}

function saveJuniorBlankState() {
  try {
    localStorage.setItem(juniorStateKey, JSON.stringify(juniorBlankState));
  } catch {
    return;
  }
}

function loadNextThrustVariant() {
  try {
    const storedVariant = localStorage.getItem(thrustStateKey);
    return storedVariant === "by" ? "by" : "to";
  } catch {
    return "to";
  }
}

function saveNextThrustVariant() {
  try {
    localStorage.setItem(thrustStateKey, nextThrustVariant);
  } catch {
    return;
  }
}

function loadLastThrustValue() {
  try {
    const value = Number(localStorage.getItem(thrustLastValueKey));
    return Number.isInteger(value) && value >= 2 && value <= 12 ? value : 7;
  } catch {
    return 7;
  }
}

function saveLastThrustValue() {
  try {
    localStorage.setItem(thrustLastValueKey, String(lastThrustValue));
  } catch {
    return;
  }
}

function currentLevel() {
  return levels[Number(slider.value)];
}

function getKeyTokenCandidates(guideLine) {
  const seenKeys = new Set();

  return guideLine.tokens.reduce((candidates, token, index) => {
    if (typeof token !== "string" && token.key && !seenKeys.has(token.key)) {
      seenKeys.add(token.key);
      candidates.push(index);
    }

    return candidates;
  }, []);
}

function getJuniorBlankIndex(guideLine) {
  if (activeBlankChoices.has(guideLine.id)) {
    return activeBlankChoices.get(guideLine.id);
  }

  const keyIndexes = getKeyTokenCandidates(guideLine);

  if (!keyIndexes.length) {
    activeBlankChoices.set(guideLine.id, null);
    return null;
  }

  const nextIndex = Number(juniorBlankState[guideLine.id] || 0);
  const tokenIndex = keyIndexes[nextIndex % keyIndexes.length];
  juniorBlankState[guideLine.id] = (nextIndex + 1) % keyIndexes.length;
  activeBlankChoices.set(guideLine.id, tokenIndex);
  saveJuniorBlankState();

  return tokenIndex;
}

function appendToken(parent, token, tokenIndex, levelKey, juniorBlankIndex) {
  if (typeof token === "string") {
    parent.append(document.createTextNode(token));
    return;
  }

  if (token.blank) {
    const blank = document.createElement("span");
    blank.className = "blank-word";
    blank.textContent = blankText;
    parent.append(blank);
    return;
  }

  if (levelKey === "senior" || (levelKey === "junior" && tokenIndex === juniorBlankIndex)) {
    const blank = document.createElement("span");
    blank.className = "blank-word";
    blank.textContent = blankText;
    parent.append(blank);
    return;
  }

  if (levelKey === "trainee") {
    const mark = document.createElement("mark");
    mark.className = "key-word";
    mark.textContent = token.text;
    parent.append(mark);
    return;
  }

  parent.append(document.createTextNode(token.text));
}

function renderGuideLine(guideLine, levelKey, itemValue = null) {
  const item = document.createElement("li");
  item.className = "guide-item";

  if (itemValue !== null) {
    item.value = itemValue;
  }

  const text = document.createElement("p");
  text.className = "guide-text";

  const juniorBlankIndex = levelKey === "junior" ? getJuniorBlankIndex(guideLine) : null;

  guideLine.tokens.forEach((token, index) => appendToken(text, token, index, levelKey, juniorBlankIndex));

  if (guideLine.practice) {
    text.append(" ");
    const arrow = document.createElement("span");
    arrow.className = "practice-arrow";
    arrow.textContent = "←";
    arrow.setAttribute("aria-label", "Practice this form");
    text.append(arrow);
  }

  item.append(text);

  if (guideLine.note) {
    const note = document.createElement("span");
    note.className = "guide-note";
    note.textContent = `(${guideLine.note})`;
    item.append(note);
  }

  return item;
}

function renderGuideList(lines, levelKey, start = 1, fixedItemValue = null) {
  const list = document.createElement("ol");
  list.className = "guide-list";
  list.start = start;
  lines.forEach((guideLine) => list.append(renderGuideLine(guideLine, levelKey, fixedItemValue)));
  return list;
}

function renderKeywords(operation) {
  const section = document.createElement("section");
  section.className = "keyword-section";

  const heading = document.createElement("h2");
  heading.textContent = "Key vocabulary";
  section.append(heading);

  const chips = document.createElement("div");
  chips.className = "keyword-chips";
  operation.keywords.forEach((keyword) => {
    const chip = document.createElement("span");
    chip.textContent = keyword;
    chips.append(chip);
  });
  section.append(chips);

  return section;
}

function renderAxisContent(operation, levelKey) {
  const fragment = document.createDocumentFragment();
  fragment.append(renderGuideList([operation.firstLine], levelKey));

  const buttonRow = document.createElement("div");
  buttonRow.className = "axis-options";
  operation.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "axis-option";
    button.textContent = option.label;
    button.setAttribute("aria-pressed", String(activeAxisChoice === option.key));

    if (activeAxisChoice === option.key) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      activeAxisChoice = option.key;
      renderModalContent();
    });
    buttonRow.append(button);
  });
  fragment.append(buttonRow);

  const selectedOption = operation.options.find((option) => option.key === activeAxisChoice);

  if (selectedOption) {
    fragment.append(renderGuideList([selectedOption.line], levelKey, 2));
  }

  return fragment;
}

function thrustResult() {
  const difference = activeCurrentThrust - lastThrustValue;

  if (difference > 0) {
    return {
      verb: "Increase",
      key: "increase",
      difference,
      direction: "increase"
    };
  }

  if (difference < 0) {
    return {
      verb: "Reduce",
      key: "reduce",
      difference: Math.abs(difference),
      direction: "reduce"
    };
  }

  return {
    verb: "Set",
    key: "set",
    difference: 0,
    direction: "set"
  };
}

function makeThrustToLine(result, practice = false) {
  if (result.direction === "set") {
    return {
      ...line("thrust-to-dynamic", [k("Set", "set"), " ", k("thrust", "thrust"), ` to ${activeCurrentThrust}.`], "putting second die"),
      practice
    };
  }

  return {
    ...line("thrust-to-dynamic", [k(result.verb, result.key), "/", k("set", "set"), " ", k("thrust", "thrust"), ` to ${activeCurrentThrust}.`], "putting second die"),
    practice
  };
}

function makeThrustByLine(result, practice = false) {
  if (result.direction === "set") {
    return {
      ...line("thrust-set-dynamic", [k("Set", "set"), " ", k("thrust", "thrust"), ` to ${activeCurrentThrust}.`], "putting second die"),
      practice
    };
  }

  return {
    ...line("thrust-by-dynamic", [k(result.verb, result.key), " ", k("thrust", "thrust"), ` by ${result.difference}.`], "putting second die"),
    practice
  };
}

function makeJuniorThrustLine(result) {
  if (activeThrustVariant === "to" || result.direction === "set") {
    const helperTokens = result.direction === "set"
      ? [b(), " ", k("thrust", "thrust"), ` to ${activeCurrentThrust}.`]
      : [b(), "/Set ", k("thrust", "thrust"), ` to ${activeCurrentThrust}.`];
    return line("thrust-junior-to", helperTokens, "putting second die");
  }

  return line("thrust-junior-by", [result.verb, "/", b(), " ", k("thrust", "thrust"), ` by ${result.difference}.`], "putting second die");
}

function makeSeniorThrustLine() {
  return line("thrust-senior", [b(), " ", k("thrust", "thrust"), ` to ${activeCurrentThrust}.`], "putting second die");
}

function renderThrustControl() {
  const panel = document.createElement("section");
  panel.className = "thrust-input-panel";

  const lastValue = document.createElement("div");
  lastValue.className = "thrust-stat";
  lastValue.innerHTML = `<span>Last recorded thrust</span><strong>${lastThrustValue}</strong>`;
  panel.append(lastValue);

  const sliderWrap = document.createElement("label");
  sliderWrap.className = "thrust-slider";

  const labelText = document.createElement("span");
  labelText.textContent = "Current thrust";

  const currentValue = document.createElement("strong");
  currentValue.textContent = String(activeCurrentThrust);

  const range = document.createElement("input");
  range.type = "range";
  range.min = "2";
  range.max = String(activeThrustMax);
  range.step = "1";
  range.value = String(activeCurrentThrust);
  range.addEventListener("input", () => {
    activeCurrentThrust = Number(range.value);
    currentValue.textContent = String(activeCurrentThrust);
  });
  range.addEventListener("change", () => {
    activeCurrentThrust = Number(range.value);
    renderModalContent();
  });

  sliderWrap.append(labelText, range, currentValue);
  panel.append(sliderWrap);

  const recordButton = document.createElement("button");
  recordButton.type = "button";
  recordButton.className = "record-thrust";
  recordButton.textContent = "Record thrust";
  recordButton.addEventListener("click", () => {
    lastThrustValue = activeCurrentThrust;
    saveLastThrustValue();
    renderModalContent();
  });
  panel.append(recordButton);

  return panel;
}

function renderThrustContent(operation, levelKey) {
  const fragment = document.createDocumentFragment();
  const result = thrustResult();

  fragment.append(renderGuideList([operation.intro], levelKey));
  fragment.append(renderThrustControl());

  if (levelKey === "trainee") {
    fragment.append(renderGuideList([
      makeThrustToLine(result, activeThrustVariant === "to"),
      makeThrustByLine(result, activeThrustVariant === "by")
    ], levelKey, 2, 2));
  } else if (levelKey === "junior") {
    fragment.append(renderGuideList([makeJuniorThrustLine(result)], levelKey, 2));
  } else {
    fragment.append(renderGuideList([makeSeniorThrustLine()], levelKey, 2));
  }

  fragment.append(renderGuideList([operation.confirm], levelKey, 3));
  return fragment;
}

function renderOperationLines(operationKey, operation) {
  if (operationKey === "gear") {
    return [
      line("gear-lowering", ["Lowering ", k("landing", "landing"), " ", k("gear", "gear"), ` ${activeStep || "1/2/3"}.`], "putting die"),
      operation.lines[1],
      operation.lines[2]
    ];
  }

  if (operationKey === "flaps") {
    return [
      line("flaps-extending", [k("Extending", "extend"), " ", k("flaps", "flaps"), ` ${activeStep || "1/2/3/4"}.`], "putting die"),
      operation.lines[1],
      operation.lines[2]
    ];
  }

  if (operationKey === "brakes") {
    return [
      line("brakes-applying", [k("Applying", "apply"), " ", k("brake", "brake"), activeStep ? ` ${activeStep}.` : "."], "putting die"),
      operation.lines[1]
    ];
  }

  return operation.lines;
}

function renderModalContent() {
  if (!activeOperation) {
    return;
  }

  const level = currentLevel();
  const operation = operations[activeOperation];

  levelName.textContent = level.label;
  modalLevel.hidden = true;
  modalTitle.hidden = level.key !== "trainee";
  modalTitle.textContent = level.key === "trainee" ? operation.title : "";

  if (level.key === "trainee") {
    modal.setAttribute("aria-labelledby", "modalTitle");
    modal.removeAttribute("aria-label");
  } else {
    modal.removeAttribute("aria-labelledby");
    modal.setAttribute("aria-label", "Helper");
  }

  modalBody.replaceChildren();

  if (level.key === "trainee") {
    modalBody.append(renderKeywords(operation));
  }

  if (activeOperation === "axis") {
    modalBody.append(renderAxisContent(operation, level.key));
    return;
  }

  if (activeOperation === "thrust") {
    modalBody.append(renderThrustContent(operation, level.key));
    return;
  }

  modalBody.append(renderGuideList(renderOperationLines(activeOperation, operation), level.key));
}

function clampThrust(value, max = activeThrustMax) {
  return Math.min(max, Math.max(2, Number(value)));
}

function prepareOperation(operationKey, options = {}) {
  activeOperation = operationKey;
  activeStep = options.step || null;
  activeAxisChoice = null;
  activeBlankChoices = new Map();

  if (operationKey === "thrust") {
    activeThrustMax = Number(options.thrustMax) === 6 ? 6 : 12;
    activeThrustVariant = nextThrustVariant;
    activeCurrentThrust = clampThrust(lastThrustValue, activeThrustMax);
    nextThrustVariant = nextThrustVariant === "to" ? "by" : "to";
    saveNextThrustVariant();
  }
}

function openHelper(operationKey, options = {}) {
  prepareOperation(operationKey, options);
  renderModalContent();
  modal.showModal();
}

function renderLevel() {
  const level = currentLevel();
  levelName.textContent = level.label;

  if (activeOperation) {
    renderModalContent();
  }
}

document.querySelectorAll("[data-operation]").forEach((hotspot) => {
  hotspot.addEventListener("click", () => openHelper(hotspot.dataset.operation, {
    step: hotspot.dataset.step || null,
    thrustMax: hotspot.dataset.thrustMax || null
  }));
  hotspot.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openHelper(hotspot.dataset.operation, {
        step: hotspot.dataset.step || null,
        thrustMax: hotspot.dataset.thrustMax || null
      });
    }
  });
});

slider.addEventListener("input", renderLevel);

closeModal.addEventListener("click", () => modal.close());

modal.addEventListener("close", () => {
  activeOperation = null;
  activeStep = null;
  activeAxisChoice = null;
  activeBlankChoices = new Map();
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.close();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.open) {
    modal.close();
  }
});

renderLevel();
