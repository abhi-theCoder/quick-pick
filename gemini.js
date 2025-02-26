require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function runGemini() {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = "What is the capital of India?";

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log(response.text());  // Output AI-generated response
    } catch (error) {
        console.error("Error:", error);
    }
}

runGemini();
