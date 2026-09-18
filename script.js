
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
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const destination = new URL("https://app.ivre.in/");
    destination.searchParams.set("mode", "signup");

    ["full_name", "location", "base_rate"].forEach(field => {
      const value = String(data.get(field) || "").trim();
      if (value) destination.searchParams.set(field, value);
    });

    const email = String(data.get("email") || "").trim();
    if (email) destination.searchParams.set("creator_email", email);

    const instagramUrl = String(data.get("instagram_url") || "").trim();
    if (instagramUrl) {
      try {
        const handle = new URL(instagramUrl).pathname.split("/").filter(Boolean)[0];
        if (handle) destination.searchParams.set("instagram_handle", `@${handle.replace(/^@/, "")}`);
      } catch {
        destination.searchParams.set("instagram_handle", instagramUrl);
      }
    }

    window.location.assign(destination.toString());
  });
});
