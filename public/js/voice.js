/* -------------------------------------------------
   voice.js  –  Capture symptoms via speech or text,
                save to localStorage, then redirect
                to medicine.html.
   -------------------------------------------------*/

// ---------- DOM references ----------
const languageSelect       = document.getElementById("language-select");
const startVoiceButton     = document.getElementById("start-voice");
const recognizedText       = document.getElementById("recognized-text");
const manualSymptomsInput  = document.getElementById("manualSymptoms");
const submitSymptomsButton = document.getElementById("submitSymptoms");

// ---------- Speech‑recognition setup ----------
let recognition;
if (!window.webkitSpeechRecognition) {
  alert("Your browser doesn’t support Web Speech API. Please use Chrome.");
} else {
  recognition = new webkitSpeechRecognition();
  recognition.continuous     = false;
  recognition.interimResults = false;

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    recognizedText.textContent = transcript;
    manualSymptomsInput.value  = transcript;
    showToast("✅ Symptoms captured successfully.", "success");
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e.error);
    const msgMap = {
      network:               "🌐 Network error. Check your connection.",
      "not-allowed":         "❌ Microphone permission denied.",
      "service-not-allowed": "❌ Speech service blocked.",
    };
    showToast(msgMap[e.error] || "⚠️ Speech recognition failed. Try again.", "error");
  };

  recognition.onend = () => {
    startVoiceButton.disabled = false;
    startVoiceButton.innerHTML = "🎤 Start Voice";
    if (!manualSymptomsInput.value.trim()) {
      recognizedText.textContent = "No input captured. Please try again.";
    }
  };
}

// ---------- Voice button ----------
startVoiceButton.addEventListener("click", () => {
  if (!recognition) return;                             // guard for unsupported browsers
  recognition.lang = languageSelect.value || "en-US";

  startVoiceButton.disabled  = true;
  startVoiceButton.innerHTML = "🎤 Listening… ⏳";
  recognizedText.textContent = "🎤 Listening...";
  showToast("🎙️ Speak your symptoms…", "info");

  try {
    recognition.start();
  } catch (err) {
    console.error("Speech‑start error:", err);
    showToast("Couldn’t start recognition. Try again.", "error");
    startVoiceButton.disabled  = false;
    startVoiceButton.innerHTML = "🎤 Start Voice";
  }
});

// ---------- Submit button ----------
submitSymptomsButton.addEventListener("click", () => {
  const symptoms = manualSymptomsInput.value.trim();
  if (!symptoms) {
    showToast("❗ Please enter or speak your symptoms.", "error");
    return;
  }

  try {
    localStorage.setItem("symptoms", symptoms);
  } catch (err) {
    console.error("localStorage error:", err);
    showToast("💾 Couldn’t save symptoms.", "error");
    return;
  }

  const profile = JSON.parse(localStorage.getItem("userProfile") || "null");
  if (!isProfileComplete(profile) && !sessionStorage.getItem("profileHint")) {
    showToast("ℹ️ After checking medicines, please fill your profile.", "info");
    sessionStorage.setItem("profileHint", "yes");
  } else {
    showToast("✅ Symptoms submitted. Redirecting…", "success");
  }

  setTimeout(() => (window.location.href = "medicine.html"), 1000);
});

// ---------- Helpers ----------
function isProfileComplete(p) {
  return !!p && ["name", "address", "age"].every(
    (k) => p[k] && String(p[k]).trim().length
  );
}

// Toast system without stacking
let toastEl;
function showToast(msg, type = "info") {
  if (toastEl) toastEl.remove();      // remove any existing toast

  toastEl = document.createElement("div");
  toastEl.textContent = msg;
  toastEl.className   = `toast ${type}`;
  Object.assign(toastEl.style, {
    position: "fixed",
    top: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 24px",
    color: "#fff",
    fontFamily: "inherit",
    fontSize: "1rem",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
    backgroundColor:
      type === "error"   ? "#e74c3c" :
      type === "success" ? "#2ecc71" :
                           "#3498db",
    zIndex: 9999,
    cursor: "pointer",
    opacity: 1,
    transition: "opacity .5s ease",
  });

  toastEl.onclick = () => toastEl.remove();
  document.body.appendChild(toastEl);

  setTimeout(() => {
    toastEl.style.opacity = 0;
    setTimeout(() => toastEl.remove(), 500);
  }, 3000);
}
