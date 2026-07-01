const brandCreators = [
  {
    initials: "AK",
    name: "Aarav Kapoor",
    handle: "@aaravmoves",
    city: "Mumbai",
    niche: "Fitness",
    followers: "18.4k",
    engagement: "7.8%",
    price: "Rs 3,000",
    score: 96,
    tags: ["Reels", "Hindi", "Verified"],
    reason: "Budget, city, audience and reel format align with the campaign prompt."
  },
  {
    initials: "MR",
    name: "Meera Rao",
    handle: "@platesbymeera",
    city: "Delhi",
    niche: "Food",
    followers: "42.1k",
    engagement: "6.1%",
    price: "Rs 5,500",
    score: 93,
    tags: ["Stories", "UGC", "Premium"],
    reason: "Strong local reach, food content history and brand-safe portfolio."
  },
  {
    initials: "SN",
    name: "Sana Nair",
    handle: "@styledbysana",
    city: "Bengaluru",
    niche: "Fashion",
    followers: "67.8k",
    engagement: "5.9%",
    price: "Rs 8,000",
    score: 91,
    tags: ["Reels", "Shoot", "English"],
    reason: "High fashion fit with premium visual quality and repeat brand collaborations."
  },
  {
    initials: "VK",
    name: "Vihaan Khanna",
    handle: "@techwithvihaan",
    city: "Pune",
    niche: "Tech",
    followers: "51.3k",
    engagement: "6.7%",
    price: "Rs 7,200",
    score: 94,
    tags: ["YouTube", "Reviews", "Verified"],
    reason: "Matches the follower target with review content and strong average watch time."
  }
];

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add("is-visible"));
}

function pickCreators(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  return brandCreators
    .map(creator => {
      let boost = 0;
      if (lowerPrompt.includes(creator.city.toLowerCase())) boost += 5;
      if (lowerPrompt.includes(creator.niche.toLowerCase())) boost += 8;
      if (lowerPrompt.includes("gym") && creator.niche === "Fitness") boost += 8;
      if (lowerPrompt.includes("food") && creator.niche === "Food") boost += 8;
      if (lowerPrompt.includes("fashion") && creator.niche === "Fashion") boost += 8;
      if (lowerPrompt.includes("tech") && creator.niche === "Tech") boost += 8;
      return { ...creator, adjustedScore: Math.min(99, creator.score + boost) };
    })
    .sort((a, b) => b.adjustedScore - a.adjustedScore)
    .slice(0, 3);
}

function renderCreators() {
  const input = document.querySelector("#creatorPrompt");
  const results = document.querySelector("#creatorResults");
  const matchCopy = document.querySelector("#matchCopy");
  if (!input || !results || !matchCopy) return;

  const selected = pickCreators(input.value);
  matchCopy.textContent = "Free AI search used. Create a company account to keep searching and save creators.";
  results.innerHTML = selected
    .map(
      creator => `
        <article class="ai-result-card">
          <div class="creator-topline">
            <span class="initial-avatar">${creator.initials}</span>
            <div>
              <h3>${creator.name}</h3>
              <p>${creator.handle} - ${creator.city}</p>
            </div>
          </div>
          <div class="score-row">
            <span>${creator.adjustedScore}% Match</span>
            <span>${creator.niche}</span>
          </div>
          <div class="metric-row">
            <span>${creator.followers} followers</span>
            <span>${creator.engagement} engagement</span>
            <span>${creator.price} per reel</span>
          </div>
          <p>${creator.reason}</p>
          <div class="badge-row">${creator.tags.map(tag => `<span>${tag}</span>`).join("")}</div>
        </article>
      `
    )
    .join("");
}

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    const input = document.querySelector("#creatorPrompt");
    if (!input) return;
    input.value = button.dataset.prompt;
    renderCreators();
  });
});

document.querySelector("#runSearch")?.addEventListener("click", renderCreators);

document.querySelectorAll("[data-add-creator]").forEach(button => {
  button.addEventListener("click", () => {
    const name = button.dataset.addCreator;
    button.textContent = `${name} added`;
    button.disabled = true;
  });
});

document.querySelectorAll("[data-wizard-tab]").forEach(button => {
  button.addEventListener("click", () => {
    const target = button.dataset.wizardTab;
    document.querySelectorAll("[data-wizard-tab]").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });
    document.querySelectorAll("[data-wizard-pane]").forEach(pane => {
      pane.classList.toggle("active", pane.dataset.wizardPane === target);
    });
  });
});

document.querySelectorAll("[data-wizard-form]").forEach(form => {
  form.addEventListener("submit", event => {
    event.preventDefault();
    const note = form.querySelector(".form-note");
    if (note) note.textContent = "Creator profile saved. The creator dashboard is ready for opportunities, messages, approvals and payouts.";
  });
});
