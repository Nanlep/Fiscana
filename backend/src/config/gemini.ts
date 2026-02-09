import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './index.js';

// Initialize Google Gemini AI client
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// Get the generative model
export const gemini = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash'
});

export { genAI };
export default gemini;
