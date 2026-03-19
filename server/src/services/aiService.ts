import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export const aiService = {
  async generateResponse(userInput: string) {
    if (!process.env.GEMINI_API_KEY) {
      // Fallback if no API key
      return this.generateMockResponse(userInput);
    }

    try {
      const prompt = `Bạn là trợ lý ảo chuyên nghiệp cho hệ thống quản lý doanh nghiệp An Thanh Sơn. 
      Nhiệm vụ của bạn là trả lời các câu hỏi của nhân viên về hệ thống (chấm công, lương, dự án, hợp đồng, nhân sự).
      Hãy trả lời thân thiện, chuyên nghiệp và ngắn gọn.
      Câu hỏi của người dùng: "${userInput}"`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.generateMockResponse(userInput);
    }
  },

  generateMockResponse(userInput: string): string {
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes('chào')) return 'Xin chào! Tôi có thể giúp gì cho bạn?';
    if (lowerInput.includes('lương')) return 'Dữ liệu lương hiện chưa được đồng bộ hoàn toàn. Bạn vui lòng kiểm tra lại sau.';
    return `Tôi đã nhận được câu hỏi: "${userInput}". Tôi đang được bảo trì phần trí tuệ nhân tạo, vui lòng quay lại sau!`;
  }
};
