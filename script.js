// ---------- Mobile navigation ----------
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#site-nav");

function setNavOpen(open) {
  navToggle.setAttribute("aria-expanded", String(open));
  siteNav.classList.toggle("is-open", open);
}

navToggle.addEventListener("click", () => {
  setNavOpen(navToggle.getAttribute("aria-expanded") !== "true");
});

// Close the menu after choosing a section, or with the Escape key
siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setNavOpen(false));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
    setNavOpen(false);
    navToggle.focus();
  }
});

// ---------- Menu filter ----------
const filterButtons = document.querySelectorAll(".filter");
const menuItems = document.querySelectorAll(".menu-item");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.filter;

    filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    menuItems.forEach((item) => {
      item.hidden = category !== "all" && item.dataset.category !== category;
    });
  });
});

// ---------- Reservation enquiry form ----------
const form = document.querySelector("#reserve-form");
const statusMessage = document.querySelector("#form-status");
const dateInput = document.querySelector("#r-date");

// Today's date as YYYY-MM-DD in the visitor's own time zone
function todayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
dateInput.min = todayISO();

// True when the chosen time (e.g. "19:00") is already over for today
function isPastTimeToday(date, time) {
  if (date !== todayISO() || !time) return false;
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  return hours * 60 + minutes <= now.getHours() * 60 + now.getMinutes();
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Checked after removing spaces and dashes, so "+234 803 123 4567" is accepted
const phonePattern = /^\+?\d{7,15}$/;

const rules = {
  name: (value) => (value.trim().length >= 2 ? "" : "Please enter your name."),
  contact: (value) => {
    const v = value.trim();
    if (!v) return "Please enter an email address or phone number.";
    return emailPattern.test(v) || phonePattern.test(v.replace(/[\s-]/g, ""))
      ? ""
      : "Enter a valid email (name@example.com) or phone number.";
  },
  date: (value) => {
    if (!value) return "Please choose a date.";
    return value < todayISO() ? "Please choose today or a future date." : "";
  },
  time: (value) => {
    if (!value) return "Please choose a time.";
    return isPastTimeToday(dateInput.value, value)
      ? "That time has already passed today. Please choose a later time or another day."
      : "";
  },
  guests: (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= 12 ? "" : "Guests must be between 1 and 12. For larger groups, contact us.";
  },
};

function validateField(name) {
  const field = form.elements[name];
  const message = rules[name](field.value);
  const errorEl = document.querySelector(`#${field.id}-error`);

  errorEl.textContent = message;
  if (message) {
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", errorEl.id);
  } else {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  }
  return !message;
}

// Clear an error as soon as the visitor fixes the field, so the layout
// doesn't jump when they move on to click "Send enquiry"
Object.keys(rules).forEach((name) => {
  const field = form.elements[name];
  const recheck = () => {
    if (field.getAttribute("aria-invalid") === "true") validateField(name);
  };
  field.addEventListener("input", recheck);
  field.addEventListener("change", recheck);
});

// Changing the date can make the chosen time valid or invalid
dateInput.addEventListener("change", () => {
  if (form.elements.time.value) validateField("time");
});

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `form-status is-${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusMessage.className = "form-status";

  const results = Object.keys(rules).map(validateField);
  if (results.includes(false)) {
    showStatus("Please fix the highlighted fields.", "error");
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }

  // No form service connected yet: say so honestly instead of pretending it was sent
  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    showStatus("Your details look good. This is a demo, so the enquiry was not sent to a restaurant.", "success");
    form.reset();
    return;
  }

  // Send to the form service (e.g. Formspree) and only confirm when it says OK
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Sending…";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);

    showStatus("Thank you! Your enquiry was received. We'll contact you to confirm your table.", "success");
    form.reset();
  } catch (error) {
    showStatus("Sorry, your enquiry couldn't be sent. Please check your connection and try again.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send enquiry";
  }
});
