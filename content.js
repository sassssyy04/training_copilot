(function () {
  // Add a visible indicator that the script is loaded
  function showScriptLoaded() {
    const indicator = document.createElement('div');
    indicator.id = 'copilot-script-loaded';
    indicator.style.position = 'fixed';
    indicator.style.top = '0';
    indicator.style.left = '0';
    indicator.style.backgroundColor = 'red';
    indicator.style.color = 'white';
    indicator.style.padding = '5px';
    indicator.style.zIndex = '10000';
    indicator.textContent = 'Copilot Script Loaded';
    document.body.appendChild(indicator);
  }

  showScriptLoaded();

  const sessionId = 'demo123'; // could also generate a UUID

  async function fetchGPTInstruction(context) {
    try {
      const res = await fetch('http://localhost:4000/instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      const data = await res.json();
      return data.instruction || "No instruction returned.";
    } catch (err) {
      console.error("Error fetching GPT instruction:", err);
      return "Error contacting GPT server.";
    }
  }

  function showOverlay(instruction) {
    let overlay = document.getElementById("copilot-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "copilot-overlay";
      overlay.style.position = "fixed";
      overlay.style.top = "20px";
      overlay.style.right = "20px";
      overlay.style.padding = "12px";
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
      overlay.style.color = "#fff";
      overlay.style.zIndex = "9999";
      overlay.style.maxWidth = "300px";
      overlay.style.fontSize = "14px";
      overlay.style.borderRadius = "10px";
      document.body.appendChild(overlay);
    }
    overlay.innerText = instruction;
  }

  async function uploadManual(sessionId, manualText) {
    const res = await fetch('http://localhost:4001/mcp/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, manual: manualText })
    });
    const data = await res.json();
    return data.steps;
  }

  async function getCurrentStep(sessionId) {
    console.log("Fetching current step for session:", sessionId);
    try {
      const res = await fetch(`http://localhost:4001/mcp/context/${sessionId}`);
      console.log("Raw response:", res);
      const data = await res.json();
      console.log("Parsed response data:", data);
      return data.currentStep;
    } catch (error) {
      console.error("Error fetching current step:", error);
      return null;
    }
  }

  async function reportStepSuccess(sessionId) {
    await fetch('http://localhost:4001/mcp/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, success: true })
    });
  }

  async function updateCopilot() {
    try {
      console.log("Updating copilot...");

      const currentStep = await getCurrentStep(sessionId);
      console.log("Got current step from MCP:", currentStep);

      if (!currentStep || !currentStep.instruction) {
        console.log("No valid step found, showing warning");
        showOverlay("⚠️ Onboarding step not defined. Please check your session.");
        return;
      }

      console.log("Sending step to instruction server:", currentStep.instruction);

      const res = await fetch('http://localhost:4000/instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: currentStep.instruction
        })
      });

      if (!res.ok) {
        throw new Error(`Instruction server responded with status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Got instruction response:", data);

      showOverlay(data.instruction || currentStep.instruction);
    } catch (error) {
      console.error("Error in updateCopilot:", error);
      showOverlay("⚠️ Error updating copilot. Check console for details.");
    }
  }

  async function askUserGoal() {
    const userGoal = prompt("What would you like help with today?");
    if (!userGoal) {
      alert("No task specified. Exiting onboarding.");
      return null;
    }
    return userGoal;
  }

  async function getStepsFromOpenAI(userGoal) {
    try {
      const res = await fetch('http://localhost:4000/generateSteps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: userGoal })
      });

      const data = await res.json();
      console.log("Steps from OpenAI:", data.steps);
      return data.steps || [];
    } catch (err) {
      console.error("Failed to get steps from OpenAI:", err);
      return [];
    }
  }

  async function postStepsToMCP(sessionId, steps) {
    const manualText = steps.map((s, i) => `Step ${i + 1}: ${s}`).join('  ');

    const res = await fetch('http://localhost:4001/mcp/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        manual: manualText
      })
    });

    const data = await res.json();
    console.log("MCP upload response:", data);
  }

  async function initializeCopilot() {
    try {
      console.log("Initializing copilot with session ID:", sessionId);
      const currentStep = await getCurrentStep(sessionId);
      console.log("Fetched step from MCP:", currentStep);

      if (!currentStep) {
        console.log("No current step found, showing completion message");
        showOverlay("🎉 Onboarding complete!");
        return;
      }

      console.log("Starting copilot update cycle");
      await updateCopilot(); // Run immediately
      setInterval(updateCopilot, 2000);
    } catch (error) {
      console.error("Error initializing copilot:", error);
      showOverlay("⚠️ Error initializing copilot. Check console for details.");
    }
  }

  // Start the copilot
  console.log("Starting copilot initialization");
  (async function main() {
    const userGoal = await askUserGoal();
    if (!userGoal) return;

    const steps = await getStepsFromOpenAI(userGoal);
    if (!steps.length) {
      showOverlay("⚠️ Failed to generate steps. Try again.");
      return;
    }
    await postStepsToMCP(sessionId, steps);
    initializeCopilot();
  })();
})();
