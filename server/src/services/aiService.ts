import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

let model: GenerativeModel | null | undefined;

function getModel(): GenerativeModel | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (model === undefined) {
    const genAI = new GoogleGenerativeAI(key);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return model;
}

export const aiService = {
  async generateResponse(userInput: string) {
    const m = getModel();
    if (!m) {
      return this.generateMockResponse(userInput);
    }

    try {
      const prompt = `Bạn là trợ lý ảo chuyên nghiệp cho hệ thống quản lý doanh nghiệp An Thanh Sơn. 
      Nhiệm vụ của bạn là trả lời các câu hỏi của nhân viên về hệ thống (chấm công, lương, dự án, hợp đồng, nhân sự).
      Hãy trả lời thân thiện, chuyên nghiệp và ngắn gọn.
      Câu hỏi của người dùng: "${userInput}"`;

      const result = await m.generateContent(prompt);
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
  },
};
