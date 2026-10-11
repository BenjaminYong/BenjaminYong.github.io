(() => {
  const CONFIG = {
    title: "Benjamin & Stephanie's Wedding",
    date: "20271030", // all-day event, YYYYMMDD
    dateEnd: "20271031",
    countdownTarget: "2027-10-30T00:00:00+11:00", // Melbourne is on AEDT in October
    location: "Melbourne, Australia",
    details: "Save the date! Formal invitation to follow.",
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const disableCountdownFlip = reduceMotion || CSS.supports("(-webkit-touch-callout: none)");

  /* ---------- Envelope intro ---------- */

  const intro = $("#intro");
  const envelope = $("#envelope");
  const main = $("#main");

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  function openEnvelope() {
    if (envelope.classList.contains("is-open")) return;
    envelope.classList.add("is-open");
    intro.classList.add("is-opening");
    setTimeout(finishIntro, reduceMotion ? 200 : 700);
  }

  function finishIntro() {
    intro.classList.add("is-done");
    main.classList.add("is-playing");
    intro.setAttribute("aria-hidden", "true");
    document.body.classList.remove("locked");
    main.focus({ preventScroll: true });
    observeReveals();
  }

  function replayIntro() {
    window.scrollTo(0, 0);
    envelope.classList.remove("is-open");
    main.classList.remove("is-playing");
    intro.classList.remove("is-opening", "is-done");
    intro.removeAttribute("aria-hidden");
    document.body.classList.add("locked");
    reveals.forEach((el) => el.classList.remove("is-in"));
    envelope.focus();
  }

  envelope.addEventListener("click", openEnvelope);
  $("[data-replay-intro]").addEventListener("click", replayIntro);

  /* ---------- Scroll reveals ---------- */

  const reveals = $$(".reveal");

  // Revealing a card also reveals everything above it, so a fast flick never skips one.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
      const upTo = reveals.indexOf(entry.target);
      reveals.slice(0, upTo + 1).forEach((el) => {
        el.classList.add("is-in");
        io.unobserve(el);
      });
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  function observeReveals() {
    reveals.forEach((el, i) => {
      el.style.transitionDelay = i < 4 ? `${i * 110}ms` : "0ms";
      io.observe(el);
    });
  }

  /* ---------- Countdown ---------- */

  const target = new Date(CONFIG.countdownTarget).getTime();
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  const cdEls = Object.fromEntries($$("[data-cd]").map((el) => [el.dataset.cd, el]));

  function setCd(key, value) {
    const el = cdEls[key];
    if (el.textContent === value) return;
    const first = !el.dataset.set;
    el.textContent = value;
    el.dataset.set = "1";
    if (first || disableCountdownFlip) return;
    el.classList.remove("flip");
    void el.offsetWidth;
    el.classList.add("flip");
  }

  function tick() {
    const ms = Math.max(0, target - Date.now());
    setCd("days", pad(Math.floor(ms / 864e5), 3));
    setCd("hours", pad(Math.floor(ms / 36e5) % 24));
    setCd("mins", pad(Math.floor(ms / 6e4) % 60));
    setCd("secs", pad(Math.floor(ms / 1e3) % 60));
  }

  tick();
  setInterval(tick, 1000);

  /* ---------- Add to calendar ---------- */

  const gcal = new URL("https://calendar.google.com/calendar/render");
  gcal.search = new URLSearchParams({
    action: "TEMPLATE",
    text: CONFIG.title,
    dates: `${CONFIG.date}/${CONFIG.dateEnd}`,
    location: CONFIG.location,
    details: CONFIG.details,
  }).toString();
  $("[data-gcal]").href = gcal.toString();

  const icsEscape = (s) => s.replace(/[\\,;]/g, (c) => `\\${c}`);

  $("[data-ics]").addEventListener("click", () => {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Benjamin and Stephanie//Save the Date//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:wedding-${CONFIG.date}@benjamin-stephanie`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${CONFIG.date}`,
      `DTEND;VALUE=DATE:${CONFIG.dateEnd}`,
      `SUMMARY:${icsEscape(CONFIG.title)}`,
      `LOCATION:${icsEscape(CONFIG.location)}`,
      `DESCRIPTION:${icsEscape(CONFIG.details)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "benjamin-stephanie-wedding.ics" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

})();
