/* -------------------------------------------------
   profile.js  –  Capture profile + order details
   (voice support for name, age, address with UX tweaks)
-------------------------------------------------*/

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- DOM refs ---------- */
  const gpsButton       = document.getElementById("gpsButton");
  const voiceAddressBtn = document.getElementById("voiceAddress");
  const voiceNameBtn    = document.getElementById("voiceName");
  const voiceAgeBtn     = document.getElementById("voiceAge");

  const saveBtn  = document.getElementById("saveProfileBtn");
  const orderBtn = document.getElementById("orderBtn");

  const addressInput = document.getElementById("address");
  const nameInput    = document.getElementById("name");
  const ageInput     = document.getElementById("age");

  const symptomReminder  = document.getElementById("symptomReminder");
  const toastContainer   = document.getElementById("toast");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  /* ---------- Reminder if no symptoms/medicine ---------- */
  const symptoms = localStorage.getItem("symptoms") || "";
  const medicine = localStorage.getItem("medicine") || "";
  if (!symptoms || !medicine) symptomReminder.style.display = "block";

  /* =======================================================
     1.  GPS → reverse‑geocode
  =======================================================*/
  gpsButton?.addEventListener("click", () => {
    if (!navigator.geolocation) return showToast("Geolocation not supported", "error");

    gpsButton.disabled = true;
    showToast("⏳ Fetching location…", "info");

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude: lat, longitude: lon } = coords;
      try {
        const res  = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
        const data = await res.json();
        if (data.display_name) {
          addressInput.value = data.display_name;
          showToast("📍 Address fetched!", "success");
        } else showToast("Failed to fetch address", "error");
      } catch (err) {
        console.error("Reverse‑geo error:", err);
        showToast("Error fetching address", "error");
      } finally {
        gpsButton.disabled = false;
      }
    }, () => {
      gpsButton.disabled = false;
      showToast("Unable to retrieve location", "error");
    });
  });

  /* =======================================================
     2.  Voice helpers  (name / age / address)
  =======================================================*/
  if (!SpeechRecognition) {
    // disable all voice buttons in unsupported browsers
    [voiceAddressBtn, voiceNameBtn, voiceAgeBtn].forEach(btn => {
      if (btn) {
        btn.disabled = true;
        btn.title = "Speech recognition not supported in this browser";
      }
    });
  } else {
    const activeRec = new Map(); // track active recognitions to avoid duplicates

    /**
     * Factory to create voice handlers without duplication
     */
    const createVoiceHandler = (btn, input, {
      label = "Speech",
      startMsg = "🎙️ Listening…",
      successMsg = "✅ Recorded!",
      errorMsg = "Speech recognition error",
      lang = "en-US",
      postProcess
    } = {}) => {
      if (!btn || !input) return;

      const rec = new SpeechRecognition();
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = false;
      activeRec.set(btn, rec);

      btn.addEventListener("click", () => {
        // prevent multiple starts
        if (btn.dataset.recording === "true") {
          rec.abort();
          btn.dataset.recording = "false";
          btn.innerHTML = btn.innerHTML.replace(" ⏳", "");
          return;
        }

        btn.dataset.recording = "true";
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = originalText + " ⏳";
        showToast(startMsg, "info");

        try {
          rec.start();
        } catch (err) {
          console.error(`${label} start error:`, err);
          showToast(errorMsg, "error");
          resetButton();
        }

        function resetButton() {
          btn.dataset.recording = "false";
          btn.disabled = false;
          btn.textContent = originalText;
        }

        rec.onresult = (e) => {
          let txt = e.results[0][0].transcript.trim();
          if (postProcess) txt = postProcess(txt);
          input.value = txt;
          showToast(successMsg, "success");
          resetButton();
        };

        rec.onerror = (e) => {
          console.error(`${label} error:`, e.error);
          showToast(errorMsg, "error");
          resetButton();
        };

        rec.onend = resetButton;
      });
    };

    /* --- Address voice input --- */
    createVoiceHandler(voiceAddressBtn, addressInput, {
      label: "Address",
      startMsg: "🎙️ Listening for address…",
      successMsg: "🏡 Address recorded!",
      errorMsg: "🎤 Address recognition error"
    });

    /* --- Name voice input --- */
    createVoiceHandler(voiceNameBtn, nameInput, {
      label: "Name",
      startMsg: "🎙️ Say your name…",
      successMsg: "📝 Name captured!",
      errorMsg: "🎤 Name recognition error"
    });

    /* --- Age voice input (spoken → digits) --- */
    createVoiceHandler(voiceAgeBtn, ageInput, {
      label: "Age",
      startMsg: "🎙️ Say your age…",
      successMsg: "🎂 Age captured!",
      errorMsg: "🎤 Age recognition error",
      postProcess: (spoken) => {
        // If any digits present, return first group
        const digits = spoken.match(/\d+/);
        if (digits) return digits[0];

        // simple word to number (0‑120)
        const tokens = spoken.toLowerCase().split(/[\s-]+/);
        const smalls = {
          zero:0, one:1, two:2, three:3, four:4, five:5, six:6,
          seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12,
          thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17,
          eighteen:18, nineteen:19
        };
        const tens = {
          twenty:20, thirty:30, forty:40, fifty:50, sixty:60,
          seventy:70, eighty:80, ninety:90
        };
        let total = 0;
        tokens.forEach(w => {
          if (smalls[w] !== undefined) total += smalls[w];
          else if (tens[w] !== undefined) total += tens[w];
          else if (w === "hundred") total *= 100;
        });
        return total ? String(total) : "";
      }
    });
  }

  /* =======================================================
     3.  Save profile
  =======================================================*/
  saveBtn?.addEventListener("click", async () => {
    const profile = {
      name: nameInput.value.trim(),
      address: addressInput.value.trim(),
      age: parseInt(ageInput.value.trim(), 10)
    };

    if (!profile.name || !profile.address || isNaN(profile.age) || !symptoms || !medicine) {
      showToast("Please complete all fields", "error");
      return;
    }

    saveBtn.disabled = true;
    showToast("⏳ Saving profile…", "info");

    try {
      const res  = await fetch("/api/save-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, symptoms, medicine })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("✅ Profile saved successfully", "success");
        nameInput.value = addressInput.value = ageInput.value = "";
        localStorage.removeItem("symptoms");
        localStorage.removeItem("medicine");
      } else showToast(data.error || "Failed to save profile", "error");
    } catch (err) {
      console.error("Save error:", err);
      showToast("Error saving profile", "error");
    } finally {
      saveBtn.disabled = false;
    }
  });

  /* =======================================================
     4.  Place order
  =======================================================*/
  orderBtn?.addEventListener("click", () => {
    showToast("✅ Order placed successfully!", "success");
  });

  /* =======================================================
     5.  Toast helper (singleton toast element)
  =======================================================*/
  let toastTimeout;
  function showToast(msg, type = "info") {
    toastContainer.textContent = msg;
    toastContainer.className   = `toast toast-slide-in ${type}`;

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastContainer.classList.remove("toast-slide-in");
      toastContainer.classList.add("toast-slide-out");
    }, 3000);
  }
});
