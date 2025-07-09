document.addEventListener("DOMContentLoaded", () => {
  const symptomSpan = document.getElementById("symptom");
  const medicineSpan = document.getElementById("medicine");
  const remedySpan = document.getElementById("homeRemedy");

  const symptoms = localStorage.getItem("symptoms");

  // Check for stored symptoms
  if (!symptoms) {
    symptomSpan.textContent = "❌ No symptoms provided.";
    medicineSpan.textContent = "N/A";
    remedySpan.textContent = "N/A";
    return;
  }

  // Display the symptoms
  symptomSpan.textContent = symptoms;

  // Show loading placeholders
  medicineSpan.textContent = "⏳ Loading medicine...";
  remedySpan.textContent = "⏳ Loading remedy...";

  // Fetch data from backend API
  fetch(`/api/medicines?symptoms=${encodeURIComponent(symptoms)}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch data. Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("✅ Data received from server:", data);

      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        const medicine = result.medicine || result.name || "❌ Medicine not available.";
        const homeRemedy = result.home_remedy || "❌ Home remedy not available.";

        medicineSpan.textContent = medicine;
        remedySpan.textContent = homeRemedy;

        // Optionally store medicine to localStorage (used in order)
        localStorage.setItem("medicine", medicine);
      } else {
        medicineSpan.textContent = "❌ No medicine found for given symptoms.";
        remedySpan.textContent = "❌ No remedy found.";
      }
    })
    .catch((error) => {
      console.error("❌ Error fetching medicine data:", error);
      medicineSpan.textContent = "❌ Error fetching medicine.";
      remedySpan.textContent = "❌ Error fetching remedy.";
    });
});
