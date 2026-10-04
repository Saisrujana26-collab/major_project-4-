import fs from 'fs';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';

interface GeneratedQuestion {
  text: string;
  options: string[];
  correctOption: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  examId: string;
  points: number;
  explanation: string;
}

const POINTS_MAP = { easy: 10, medium: 20, hard: 30 };

export async function parsePdfAndGenerateQuestions(
  filePath: string,
  examId: string,
  questionsPerDifficulty = 5
): Promise<GeneratedQuestion[]> {
  // Parse PDF
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const text = pdfData.text.slice(0, 8000); // Limit to 8000 chars for API

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.log('⚠️ No OpenAI API key — using rule-based question generation');
    return generateRuleBasedQuestions(text, examId, questionsPerDifficulty);
  }

  return generateWithOpenAI(text, examId, questionsPerDifficulty, apiKey);
}

async function generateWithOpenAI(
  text: string,
  examId: string,
  questionsPerDifficulty: number,
  apiKey: string
): Promise<GeneratedQuestion[]> {
  const openai = new OpenAI({ apiKey });

  const prompt = `You are an expert teacher creating a multiple-choice quiz from the following content.
Generate exactly ${questionsPerDifficulty} EASY, ${questionsPerDifficulty} MEDIUM, and ${questionsPerDifficulty} HARD questions.

Rules:
- Easy: basic recall/definition questions
- Medium: application/comprehension questions  
- Hard: analysis/synthesis/evaluation questions
- Each question has exactly 4 options (A, B, C, D)
- Specify the correct option index (0=A, 1=B, 2=C, 3=D)
- Provide a brief explanation for the correct answer

Return ONLY valid JSON array:
[
  {
    "text": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": 0,
    "difficulty": "easy",
    "topic": "Topic name",
    "explanation": "Why this is correct"
  }
]

CONTENT:
${text}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const raw = response.choices[0]?.message?.content || '[]';
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse OpenAI response');

  const questions: Array<Omit<GeneratedQuestion, 'examId' | 'points'>> = JSON.parse(jsonMatch[0]);

  return questions.map((q) => ({
    ...q,
    examId,
    points: POINTS_MAP[q.difficulty] || 10,
  }));
}

// Fallback: rule-based question generation from text
function generateRuleBasedQuestions(
  text: string,
  examId: string,
  questionsPerDifficulty: number
): GeneratedQuestion[] {
  // Clean and split text into meaningful sentences
  const sentences = text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 300 && /[a-zA-Z]/.test(s));

  // Extract key terms (capitalized words, technical terms)
  const keyTerms = text
    .match(/\b[A-Z][a-zA-Z]{3,}\b/g)
    ?.filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 30) || [];

  const questions: GeneratedQuestion[] = [];
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

  const questionTemplates = {
    easy: [
      (sentence: string, answer: string) => `What is "${answer}" as mentioned in the text?`,
      (sentence: string, answer: string) => `Which of the following correctly defines "${answer}"?`,
      (sentence: string, answer: string) => `"${answer}" refers to which of the following?`,
    ],
    medium: [
      (sentence: string, answer: string) => `According to the content, which statement about "${answer}" is correct?`,
      (sentence: string, answer: string) => `What is the significance of "${answer}" in this context?`,
      (sentence: string, answer: string) => `How is "${answer}" best described based on the material?`,
    ],
    hard: [
      (sentence: string, answer: string) => `Analyze the role of "${answer}" — which conclusion is most accurate?`,
      (sentence: string, answer: string) => `Which of the following best evaluates the concept of "${answer}"?`,
      (sentence: string, answer: string) => `In a critical analysis, "${answer}" would most likely be associated with:`,
    ],
  };

  let sentenceIdx = 0;

  for (const difficulty of difficulties) {
    for (let i = 0; i < questionsPerDifficulty; i++) {
      const sentence = sentences[sentenceIdx % sentences.length] || `Key concept from the uploaded material.`;
      sentenceIdx++;

      // Pick a meaningful answer from key terms or sentence
      const answer = keyTerms[i % keyTerms.length] || sentence.split(' ').slice(2, 5).join(' ');
      const templates = questionTemplates[difficulty];
      const questionText = templates[i % templates.length](sentence, answer);

      // Generate 3 wrong options from other terms/sentences
      const wrongOptions: string[] = [];
      for (let w = 1; w <= 3; w++) {
        const wrongTerm = keyTerms[(i + w * 3) % Math.max(keyTerms.length, 1)]
          || sentences[(sentenceIdx + w) % Math.max(sentences.length, 1)]?.split(' ').slice(0, 4).join(' ')
          || `Option ${w}`;
        wrongOptions.push(wrongTerm !== answer ? wrongTerm : `Alternative concept ${w}`);
      }

      // Build options array and shuffle
      const allOptions = [answer, ...wrongOptions.slice(0, 3)];
      const shuffled = allOptions
        .map((o, idx) => ({ o: o.substring(0, 100), originalIdx: idx }))
        .sort(() => Math.random() - 0.5);
      const correctOption = shuffled.findIndex((s) => s.originalIdx === 0);

      questions.push({
        text: questionText,
        options: shuffled.map((s) => s.o),
        correctOption,
        difficulty,
        topic: keyTerms[0] || 'General',
        examId,
        points: POINTS_MAP[difficulty],
        explanation: `Based on the source material: "${sentence.substring(0, 120)}..."`,
      });
    }
  }

  return questions;
}
