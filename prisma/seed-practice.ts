/**
 * Sample practice content for Class 9 Mathematics: eight chapters, forty approved questions with
 * worked explanations, and one published model paper. It exists so the practice area has
 * something to show on a fresh database. Teachers should replace it with the real syllabus and
 * past papers from the Question Bank screen. Safe to run more than once: anything that already
 * exists (same chapter number, same question text) is left alone.
 *
 *   npx tsx prisma/seed-practice.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type Q = {
  type: "MCQ" | "NUMERICAL" | "SHORT_ANSWER";
  text: string;
  options?: string[];
  answer: string;
  explanation: string;
  marks?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  topic?: string;
};

const CHAPTERS: { number: number; title: string; questions: Q[] }[] = [
  {
    number: 1,
    title: "Matrices and Determinants",
    questions: [
      { type: "MCQ", text: "The order of a matrix with 3 rows and 2 columns is", options: ["2 × 3", "3 × 2", "3 × 3", "2 × 2"], answer: "3 × 2", explanation: "Order is written as rows × columns, so 3 rows and 2 columns gives 3 × 2.", difficulty: "EASY", topic: "Order of a matrix" },
      { type: "MCQ", text: "A matrix with the same number of rows and columns is called a", options: ["Row matrix", "Column matrix", "Square matrix", "Zero matrix"], answer: "Square matrix", explanation: "When rows and columns are equal in number, the matrix is square.", difficulty: "EASY", topic: "Types of matrices" },
      { type: "NUMERICAL", text: "Find the determinant of the 2 × 2 matrix with first row 3, 2 and second row 1, 4.", answer: "10", explanation: "For rows (a, b) and (c, d) the determinant is ad − bc. Here 3 × 4 − 2 × 1 = 12 − 2 = 10.", topic: "Determinant" },
      { type: "MCQ", text: "Matrix A has rows (1, 2) and (3, 4). Matrix B has rows (5, 6) and (7, 8). What is the first row of A + B?", options: ["(6, 8)", "(5, 12)", "(6, 7)", "(4, 4)"], answer: "(6, 8)", explanation: "Add matching entries: 1 + 5 = 6 and 2 + 6 = 8.", topic: "Addition of matrices" },
      { type: "SHORT_ANSWER", text: "Define a singular matrix.", answer: "A square matrix whose determinant is zero.", explanation: "A matrix is singular when its determinant equals 0. Such a matrix has no multiplicative inverse.", marks: 2, difficulty: "MEDIUM", topic: "Singular matrix" },
    ],
  },
  {
    number: 2,
    title: "Real and Complex Numbers",
    questions: [
      { type: "MCQ", text: "Which of the following is an irrational number?", options: ["4", "0.25", "√2", "3/5"], answer: "√2", explanation: "√2 cannot be written as a fraction of two integers, so it is irrational. The others are all rational.", difficulty: "EASY", topic: "Rational and irrational numbers" },
      { type: "MCQ", text: "The value of i² is", options: ["1", "−1", "i", "−i"], answer: "−1", explanation: "The imaginary unit i is defined by i² = −1.", difficulty: "EASY", topic: "Imaginary unit" },
      { type: "NUMERICAL", text: "Simplify (2 + 3i) + (4 − 5i). What is the real part of the result?", answer: "6", explanation: "Add real parts: 2 + 4 = 6, and imaginary parts: 3i − 5i = −2i. The result is 6 − 2i, so the real part is 6.", topic: "Complex number addition" },
      { type: "MCQ", text: "The conjugate of 3 + 4i is", options: ["3 − 4i", "−3 + 4i", "−3 − 4i", "4 + 3i"], answer: "3 − 4i", explanation: "The conjugate keeps the real part and changes the sign of the imaginary part.", topic: "Complex conjugate" },
      { type: "SHORT_ANSWER", text: "Write two rational numbers between 1 and 2.", answer: "For example 3/2 and 5/4.", explanation: "Any fractions strictly between 1 and 2 work, such as 3/2 = 1.5 and 5/4 = 1.25.", marks: 2, difficulty: "EASY", topic: "Rational numbers" },
    ],
  },
  {
    number: 3,
    title: "Logarithms",
    questions: [
      { type: "MCQ", text: "log₁₀ 1000 equals", options: ["1", "2", "3", "10"], answer: "3", explanation: "10³ = 1000, so the logarithm to base 10 is 3.", difficulty: "EASY", topic: "Definition of a logarithm" },
      { type: "NUMERICAL", text: "If log₂ x = 5, find x.", answer: "32", explanation: "log₂ x = 5 means x = 2⁵ = 32.", topic: "Logarithm to exponent form" },
      { type: "MCQ", text: "log (ab) equals", options: ["log a + log b", "log a − log b", "log a × log b", "a log b"], answer: "log a + log b", explanation: "The product law: the logarithm of a product is the sum of the logarithms.", topic: "Laws of logarithms" },
      { type: "MCQ", text: "The value of log₅ 1 is", options: ["0", "1", "5", "undefined"], answer: "0", explanation: "Any number to the power 0 is 1, so log of 1 to any base is 0.", difficulty: "EASY", topic: "Special values" },
      { type: "NUMERICAL", text: "Find log₃ 81.", answer: "4", explanation: "3⁴ = 81, so log₃ 81 = 4.", difficulty: "MEDIUM", topic: "Definition of a logarithm" },
    ],
  },
  {
    number: 4,
    title: "Algebraic Expressions",
    questions: [
      { type: "MCQ", text: "The degree of the polynomial 3x⁴ + 2x² − 7 is", options: ["2", "3", "4", "7"], answer: "4", explanation: "The degree is the highest power of x, which is 4.", difficulty: "EASY", topic: "Degree of a polynomial" },
      { type: "MCQ", text: "(a + b)² equals", options: ["a² + b²", "a² + 2ab + b²", "a² − 2ab + b²", "2a + 2b"], answer: "a² + 2ab + b²", explanation: "Square of a sum: (a + b)² = a² + 2ab + b². The middle term 2ab is often forgotten.", topic: "Algebraic formulas" },
      { type: "NUMERICAL", text: "Find the value of (x + 3)² when x = 2.", answer: "25", explanation: "Put x = 2: (2 + 3)² = 5² = 25.", topic: "Substitution" },
      { type: "MCQ", text: "(a + b)(a − b) equals", options: ["a² + b²", "a² − b²", "a² + 2ab − b²", "2a"], answer: "a² − b²", explanation: "Difference of squares: the middle terms cancel, leaving a² − b².", topic: "Algebraic formulas" },
      { type: "SHORT_ANSWER", text: "Expand (x + 2)(x + 5).", answer: "x² + 7x + 10", explanation: "Multiply each term: x·x + x·5 + 2·x + 2·5 = x² + 5x + 2x + 10 = x² + 7x + 10.", marks: 2, difficulty: "MEDIUM", topic: "Expansion" },
    ],
  },
  {
    number: 5,
    title: "Factorization",
    questions: [
      { type: "MCQ", text: "Factorise x² − 9.", options: ["(x − 3)(x + 3)", "(x − 9)(x + 1)", "(x − 3)²", "(x + 3)²"], answer: "(x − 3)(x + 3)", explanation: "x² − 9 = x² − 3², a difference of squares, so it factorises as (x − 3)(x + 3).", difficulty: "EASY", topic: "Difference of squares" },
      { type: "MCQ", text: "The factors of x² + 5x + 6 are", options: ["(x + 1)(x + 6)", "(x + 2)(x + 3)", "(x − 2)(x − 3)", "(x + 5)(x + 1)"], answer: "(x + 2)(x + 3)", explanation: "Find two numbers with product 6 and sum 5: they are 2 and 3.", topic: "Splitting the middle term" },
      { type: "SHORT_ANSWER", text: "Factorise 2x² + 8x.", answer: "2x(x + 4)", explanation: "The common factor of 2x² and 8x is 2x, giving 2x(x + 4).", marks: 2, difficulty: "EASY", topic: "Common factors" },
      { type: "MCQ", text: "The highest common factor of 6ab and 9a is", options: ["3a", "3b", "6a", "9"], answer: "3a", explanation: "The highest common factor of 6 and 9 is 3, and both terms contain a, so the answer is 3a.", topic: "Common factors" },
      { type: "NUMERICAL", text: "The equation x² − 5x + 6 = 0 has one root equal to 2. Find the other root.", answer: "3", explanation: "x² − 5x + 6 = (x − 2)(x − 3), so the roots are 2 and 3.", difficulty: "MEDIUM", topic: "Roots from factors" },
    ],
  },
  {
    number: 6,
    title: "Linear Equations and Inequalities",
    questions: [
      { type: "NUMERICAL", text: "Solve 2x + 5 = 15. Find x.", answer: "5", explanation: "Subtract 5 from both sides: 2x = 10. Divide by 2: x = 5.", difficulty: "EASY", topic: "Solving linear equations" },
      { type: "NUMERICAL", text: "Solve 5x − 3 = 12. Find x.", answer: "3", explanation: "Add 3 to both sides: 5x = 15. Divide by 5: x = 3.", topic: "Solving linear equations" },
      { type: "MCQ", text: "The solution of x + 3 > 5 is", options: ["x > 2", "x < 2", "x > 8", "x < 8"], answer: "x > 2", explanation: "Subtract 3 from both sides: x > 2.", topic: "Inequalities" },
      { type: "MCQ", text: "If 2x < 8, then", options: ["x < 4", "x > 4", "x < 16", "x > 16"], answer: "x < 4", explanation: "Divide both sides by 2 (positive, so the sign stays): x < 4.", difficulty: "EASY", topic: "Inequalities" },
      { type: "SHORT_ANSWER", text: "Solve 4(x − 2) = 12.", answer: "x = 5", explanation: "Divide both sides by 4: x − 2 = 3. Add 2: x = 5.", marks: 2, difficulty: "MEDIUM", topic: "Solving linear equations" },
    ],
  },
  {
    number: 7,
    title: "Linear Graphs",
    questions: [
      { type: "MCQ", text: "The graph of y = 2x + 1 is a", options: ["Straight line", "Circle", "Parabola", "Triangle"], answer: "Straight line", explanation: "An equation of the form y = mx + c always gives a straight line.", difficulty: "EASY", topic: "Linear graphs" },
      { type: "NUMERICAL", text: "For y = 2x + 1, find y when x = 3.", answer: "7", explanation: "y = 2(3) + 1 = 6 + 1 = 7.", difficulty: "EASY", topic: "Plotting points" },
      { type: "MCQ", text: "The point where a graph crosses the y-axis has an x-coordinate of", options: ["0", "1", "−1", "y"], answer: "0", explanation: "Every point on the y-axis has x = 0.", topic: "Intercepts" },
      { type: "NUMERICAL", text: "What is the slope of the line y = 3x − 2?", answer: "3", explanation: "In y = mx + c the slope is m, the number multiplying x. Here it is 3.", topic: "Slope" },
      { type: "MCQ", text: "The y-intercept of y = 4x + 7 is", options: ["4", "7", "−7", "11"], answer: "7", explanation: "Put x = 0: y = 7. In y = mx + c the intercept is c.", topic: "Intercepts" },
    ],
  },
  {
    number: 8,
    title: "Basic Statistics",
    questions: [
      { type: "NUMERICAL", text: "Find the mean of 2, 4, 6, 8, 10.", answer: "6", explanation: "Sum = 30 and there are 5 values, so mean = 30 ÷ 5 = 6.", difficulty: "EASY", topic: "Mean" },
      { type: "NUMERICAL", text: "Find the median of 3, 7, 5, 9, 1.", answer: "5", explanation: "Arrange in order: 1, 3, 5, 7, 9. The middle value is 5.", topic: "Median" },
      { type: "MCQ", text: "The mode of 2, 3, 3, 5, 3, 7 is", options: ["2", "3", "5", "7"], answer: "3", explanation: "The mode is the value that appears most often. 3 appears three times.", difficulty: "EASY", topic: "Mode" },
      { type: "NUMERICAL", text: "Find the range of the data 12, 5, 20, 9.", answer: "15", explanation: "Range = largest − smallest = 20 − 5 = 15.", topic: "Range" },
      { type: "MCQ", text: "The most frequent value in a data set is the", options: ["Mean", "Median", "Mode", "Range"], answer: "Mode", explanation: "The mode is defined as the most frequently occurring value.", difficulty: "EASY", topic: "Mode" },
    ],
  },
];

const PAPER_QUESTIONS: { chapter: number; q: Q }[] = [
  { chapter: 1, q: { type: "MCQ", text: "The transpose of a matrix with rows (1, 2) and (3, 4) has first row", options: ["(1, 3)", "(2, 4)", "(1, 2)", "(3, 4)"], answer: "(1, 3)", explanation: "Transposing turns columns into rows. The first column is (1, 3), so it becomes the first row.", topic: "Transpose" } },
  { chapter: 2, q: { type: "NUMERICAL", text: "Find the value of √144.", answer: "12", explanation: "12 × 12 = 144, so √144 = 12.", difficulty: "EASY", topic: "Square roots" } },
  { chapter: 3, q: { type: "MCQ", text: "log 100 (to base 10) equals", options: ["1", "2", "10", "100"], answer: "2", explanation: "10² = 100, so log₁₀ 100 = 2.", difficulty: "EASY", topic: "Definition of a logarithm" } },
  { chapter: 4, q: { type: "NUMERICAL", text: "Find the value of 5² + 2 × 5 × 3 + 3².", answer: "64", explanation: "This is (5 + 3)² = 8² = 64. Checking: 25 + 30 + 9 = 64.", topic: "Algebraic formulas" } },
  { chapter: 5, q: { type: "MCQ", text: "Factorise x² − 4x + 4.", options: ["(x − 2)²", "(x + 2)²", "(x − 4)(x + 1)", "(x − 2)(x + 2)"], answer: "(x − 2)²", explanation: "x² − 4x + 4 = x² − 2(2)x + 2², a perfect square, so it equals (x − 2)².", topic: "Perfect squares" } },
  { chapter: 6, q: { type: "NUMERICAL", text: "Solve 7x = 63. Find x.", answer: "9", explanation: "Divide both sides by 7: x = 9.", difficulty: "EASY", topic: "Solving linear equations" } },
  { chapter: 7, q: { type: "MCQ", text: "The slope of a horizontal line is", options: ["0", "1", "undefined", "−1"], answer: "0", explanation: "A horizontal line does not rise, so its slope is 0.", topic: "Slope" } },
  { chapter: 8, q: { type: "NUMERICAL", text: "Find the mean of 10, 20, 30.", answer: "20", explanation: "Sum = 60 over 3 values gives 20.", difficulty: "EASY", topic: "Mean" } },
];

async function main() {
  const batch = await db.batch.findFirst({
    where: { name: "Class 9 Federal Board Morning A" },
    include: { subjects: { include: { subject: true } }, academicLevel: true },
  });
  if (!batch) throw new Error('Could not find the batch "Class 9 Federal Board Morning A" to attach the sample content to.');
  const subject = batch.subjects.find((s) => s.subject.name === "Mathematics")?.subject;
  if (!subject) throw new Error("That batch has no Mathematics subject.");
  const academicLevelId = batch.academicLevelId;

  let chaptersMade = 0;
  let questionsMade = 0;
  const chapterIds = new Map<number, string>();

  for (const ch of CHAPTERS) {
    let chapter = await db.chapter.findFirst({ where: { subjectId: subject.id, academicLevelId, boardId: null, number: ch.number } });
    if (!chapter) {
      chapter = await db.chapter.create({ data: { subjectId: subject.id, academicLevelId, boardId: null, number: ch.number, title: ch.title } });
      chaptersMade++;
    }
    chapterIds.set(ch.number, chapter.id);

    for (const q of ch.questions) {
      const exists = await db.bankQuestion.findFirst({ where: { chapterId: chapter.id, questionText: q.text } });
      if (exists) continue;
      await db.bankQuestion.create({
        data: {
          subjectId: subject.id,
          academicLevelId,
          boardId: null,
          chapterId: chapter.id,
          topic: q.topic,
          type: q.type,
          questionText: q.text,
          options: q.options,
          correctAnswer: q.answer,
          explanation: q.explanation,
          marks: q.marks ?? 1,
          difficulty: q.difficulty ?? "MEDIUM",
          source: "TEACHER",
          status: "APPROVED",
        },
      });
      questionsMade++;
    }
  }

  let paper = await db.pastPaper.findFirst({ where: { subjectId: subject.id, academicLevelId, title: "Model Paper 1 (sample)" } });
  if (!paper) {
    paper = await db.pastPaper.create({
      data: { subjectId: subject.id, academicLevelId, boardId: null, year: 2024, session: "MODEL", title: "Model Paper 1 (sample)", totalMarks: 8, durationMinutes: 15, isPublished: true },
    });
  }
  let order = 1;
  for (const { chapter, q } of PAPER_QUESTIONS) {
    const exists = await db.bankQuestion.findFirst({ where: { pastPaperId: paper.id, questionText: q.text } });
    if (exists) {
      order++;
      continue;
    }
    await db.bankQuestion.create({
      data: {
        subjectId: subject.id,
        academicLevelId,
        boardId: null,
        chapterId: chapterIds.get(chapter)!,
        topic: q.topic,
        type: q.type,
        questionText: q.text,
        options: q.options,
        correctAnswer: q.answer,
        explanation: q.explanation,
        marks: q.marks ?? 1,
        difficulty: q.difficulty ?? "MEDIUM",
        source: "PAST_PAPER",
        status: "APPROVED",
        pastPaperId: paper.id,
        paperOrder: order++,
      },
    });
    questionsMade++;
  }

  console.log(`Chapters added: ${chaptersMade}. Questions added: ${questionsMade}. Model paper: ${paper.title}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
