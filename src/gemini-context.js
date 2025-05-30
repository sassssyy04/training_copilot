const { GoogleGenerativeAI } = require('@google/generative-ai');
const screenshot = require('screenshot-desktop');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function captureScreen() {
  try {
    const imgBuffer = await screenshot({ format: 'png' }); // get screenshot as PNG buffer
    const base64Image = imgBuffer.toString('base64');
    return base64Image;
  } catch (err) {
    console.error("Screenshot capture failed:", err);
    return null;
  }
}

async function getOnboardingInstruction(step) {
    try {
      const screenshot = await captureScreen();
  
      if (!screenshot) {
        throw new Error("Screenshot data is empty");
      }
  
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
      const prompt = `You are an onboarding copilot. 
  The user is looking at this screen (image below). 
  Their current onboarding instruction is: "${step}". 
  Provide a concise, clear step-by-step instruction to help them complete it.`;
  
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/png",
            data: screenshot,
          },
        },
      ]);
  
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error getting onboarding instruction with Gemini:", error);
      return "⚠️ Gemini failed to generate instruction.";
    }
  }
  

module.exports = {
    getOnboardingInstruction
  };