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

// Show that the script is loaded
showScriptLoaded();

async function getScreenContext() {
  // Get the first 2000 chars of visible page text
  return document.body.innerText.slice(0, 2000);
}

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
  return data.steps; // Returns extracted onboarding steps
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
    const context = await getScreenContext();
    console.log("Got screen context:", context.substring(0, 100) + "...");
    
    const currentStep = await getCurrentStep(sessionId);
    console.log("Got current step from MCP:", currentStep);

    if (!currentStep || !currentStep.instruction) {
      console.log("No valid step found, showing warning");
      showOverlay("⚠️ Onboarding step not defined. Please check your session.");
      return;
    }

    console.log("Sending to instruction server:", {
      context: context.substring(0, 100) + "...",
      step: currentStep.instruction
    });

    const res = await fetch('http://localhost:4000/instruction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context,
        step: currentStep.instruction
      })
    });

    if (!res.ok) {
      throw new Error(`Instruction server responded with status: ${res.status}`);
    }

    const data = await res.json();
    console.log("Got instruction response:", data);

    if (!data.instruction) {
      console.log("No instruction in response, using step instruction");
      showOverlay(currentStep.instruction);
    } else {
      console.log("Showing instruction from server");
      showOverlay(data.instruction);
    }
  } catch (error) {
    console.error("Error in updateCopilot:", error);
    showOverlay("⚠️ Error updating copilot. Check console for details.");
  }
}

// Initialize the copilot
const sessionId = 'demo123'; // could also generate a UUID

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
    // Start and refresh every 10 seconds
    await updateCopilot(); // Run immediately
    setInterval(updateCopilot, 10000);
  } catch (error) {
    console.error("Error initializing copilot:", error);
    showOverlay("⚠️ Error initializing copilot. Check console for details.");
  }
}

// Start the copilot
console.log("Starting copilot initialization");
initializeCopilot();
