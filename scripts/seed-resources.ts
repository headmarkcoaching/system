// Starter articles for the website's Resources menu (blog and exam-preparation tips).
// Safe to run again: an article is created once per title and never overwritten, so edits made in
// Admin → Blog & Study Tips are kept.
//   npx tsx --conditions=react-server scripts/seed-resources.ts
try {
  process.loadEnvFile();
} catch {
  // No .env file: the environment is injected another way.
}
import { db } from "@/lib/db";
import { slugify } from "@/lib/services/resources";

type Seed = { title: string; excerpt: string; category: "BLOG" | "STUDY_TIPS"; topic: string; body: string; daysAgo: number };

const ARTICLES: Seed[] = [
  {
    title: "How to Build a Daily Study Routine That Actually Works",
    category: "BLOG",
    topic: "Study skills",
    daysAgo: 21,
    excerpt: "A routine you can keep beats a perfect timetable you abandon in three days. Here is how to build one that fits real life.",
    body: `Most students make a timetable that needs eight hours of perfect focus every day. By the third day it is broken, and they feel they have failed. A good routine is smaller, flexible and easy to restart.

## Start with what you can keep

Decide on the **minimum** you will do every single day, even on a bad day. For most students that is two focused study sessions of 45 minutes each. Everything beyond that is a bonus. Keeping a small promise to yourself every day builds more discipline than a huge plan you break.

## Study at the same time each day

Your brain gets used to a pattern. If you sit down at 5 pm every day, starting becomes easier because it is no longer a decision. Pick the time of day when you are most alert and give it to your hardest subject.

## Use short sessions with breaks

- Study for 45 minutes, then take a 10 minute break away from your phone.
- After four sessions, take a longer break of 30 minutes.
- During a session, keep only the book and notes for that subject on your desk.

> Put your phone in another room while you study. Even a silent phone on the desk pulls your attention away.

## Rotate your subjects

Studying one subject for six hours tires you out. Rotate two or three subjects through the day and put the difficult one first. Finish each session by writing three lines about what you learned. This small habit makes revision much faster later.

## Review before you sleep

Spend 10 minutes before bed looking over what you studied today. Sleep helps your memory store it. Then plan tomorrow's two sessions on one line of paper so you wake up knowing exactly what to do.

## When you miss a day

Do not try to double up the next day. Simply do the minimum again. Missing one day matters far less than giving up for a week.

If you would like help building a plan around your own subjects and exam date, our teachers do this with every student in the first week. [Book a free trial class](/enroll) to see how.`,
  },
  {
    title: "Why Past Papers Beat Re-Reading the Textbook",
    category: "BLOG",
    topic: "Study skills",
    daysAgo: 14,
    excerpt: "Re-reading feels productive but teaches little. Practising with past papers shows you exactly what the exam asks and where you lose marks.",
    body: `Many students spend the weeks before an exam reading their textbook a second and third time. It feels like hard work, but research on learning shows that simply re-reading is one of the weakest ways to study. You recognise the words, so you think you know them, but you cannot yet produce the answer when the question is in front of you.

## What past papers do for you

- They show the **style of questions** the Board asks, so nothing in the exam hall feels strange.
- They show which topics come up again and again.
- They train you to write answers in the time you will have.
- They reveal your weak areas honestly, while there is still time to fix them.

## How to use a past paper properly

1. Revise a chapter or two first. Do not start with a paper before you have studied anything.
2. Sit the paper in one go, with a timer, and no notes.
3. Mark it strictly using your teacher's or the Board's marking scheme.
4. Write down every question you lost marks on, and why: did you not know it, did you run out of time, or did you misread the question?
5. Go back to those topics, then try another paper a few days later.

> Keep a small notebook of "mistakes I made". Reading it the night before the exam is worth more than another read of the whole book.

## When to start

Begin with one paper a week early in the year, then move to two or three a week in the final month. Our [past papers page](/resources/past-papers) lists the papers available by class and subject, and students can attempt them online inside the portal.

## One warning

Past papers are practice, not prediction. Questions are rarely repeated word for word, so always understand the idea behind an answer instead of memorising it.`,
  },
  {
    title: "How Parents Can Support Board Exam Preparation Without Adding Pressure",
    category: "BLOG",
    topic: "Parents",
    daysAgo: 10,
    excerpt: "Your child needs your support more than your supervision. Simple habits that help, and the things that quietly make exam stress worse.",
    body: `Board exam year is stressful for the whole family. Most parents want to help, but pressure, comparisons and constant questions about marks can slow a child down. Here is what helps instead.

## What helps

- **Ask about the plan, not just the marks.** "What are you studying today and what do you need from me?" opens a conversation. "How many marks will you get?" closes one.
- **Protect a quiet place and time to study.** A fixed corner, a fixed time, and the television off during that time.
- **Make sure they sleep and eat well.** A tired child cannot concentrate, whatever the hours on the clock say.
- **Watch the signs.** Sudden silence, skipped meals or constant headaches can mean your child is overwhelmed. Talk early.
- **Praise effort and consistency.** A child who studied hard and did not get the result they hoped for needs encouragement, not disappointment.

## What to avoid

- Comparing your child with cousins or classmates.
- Checking on them every ten minutes.
- Saying "your whole future depends on this exam". It adds fear, and fear makes memory worse.
- Cancelling every break, walk and bit of fun. Rest is part of studying.

## Stay informed without hovering

It is hard to support your child if you only find out how they are doing when the result arrives. At Head Mark Coaching, parents see attendance, homework and test results in their own portal, along with a weekly update. That way you can step in early and calmly if something slips.

> A short talk each evening, "what went well today, and what was hard?", does more for a student's confidence than any amount of checking.

If you want to see how this works for your child, you can [book a free trial class](/enroll).`,
  },
  {
    title: "How to Handle Exam Stress in the Last Month",
    category: "BLOG",
    topic: "Wellbeing",
    daysAgo: 7,
    excerpt: "A little nervousness is normal and even useful. These practical habits stop stress from taking over in the weeks before your exams.",
    body: `Feeling nervous before exams is normal. A small amount of pressure helps you focus. The trouble starts when worry grows so big that you cannot sleep, cannot concentrate, or freeze when you open the paper. These habits help.

## Break the work into small pieces

A syllabus feels huge when you look at all of it at once. Write a list of chapters, then choose only today's two or three. Ticking things off shows you real progress, and progress calms the mind.

## Keep your body in good shape

- Sleep at least seven hours. Staying awake all night before a paper usually costs more than it gives.
- Eat proper meals and drink water. Do not live on tea, energy drinks and snacks.
- Take a 20 minute walk or do some light exercise every day.

## Slow down your breathing when panic comes

If your heart races or your mind goes blank, put your feet flat on the floor, breathe in slowly for four counts, hold for a moment, and breathe out for six counts. Repeat five times. Slow breathing tells your body that you are safe.

## Stop comparing

Other students will tell you they studied all night or finished the book three times. You do not know if that is true, and it does not matter. Compare yourself only with where you were last week.

## Talk to someone

A friend, a parent or a teacher can help just by listening. If worry is stopping you from eating, sleeping or studying for many days, tell an adult you trust. Asking for help is a sign of strength.

> On the night before the exam, pack your pens, ID and admission slip, then stop studying early. A calm evening is better revision than a panicked one.

Our teachers also keep an eye on how students are coping during class and will talk to you and your parents if they notice you are struggling.`,
  },
  {
    title: "Physics: How to Solve Numericals Without Panicking",
    category: "STUDY_TIPS",
    topic: "Physics",
    daysAgo: 20,
    excerpt: "A simple five-step method for numerical problems, plus the mistakes that quietly cost students marks every year.",
    body: `Numericals scare many students, but almost every one can be solved by following the same steps. Practise this method until it becomes automatic.

## The five-step method

1. **Read the question twice** and underline what is given and what is asked.
2. **Write the given values with their units** in a list. Convert units first if they do not match, such as centimetres to metres.
3. **Write the formula** you will use. If you are unsure, ask which quantities you have and which you need, then find the formula that links them.
4. **Substitute the values** carefully and calculate. Show each line of working.
5. **Write the answer with its unit**, and check that it makes sense.

> Marks are given for the formula, the substitution, the answer and the unit. Even if your final answer is wrong, a clear method can earn most of the marks.

## Common mistakes

- Forgetting to change units, for example grams to kilograms.
- Mixing up similar formulas, such as speed and acceleration, or series and parallel resistance.
- Leaving out the unit in the final answer.
- Rounding too early. Keep the full number until the last step.

## How to practise

- After learning a chapter, solve every solved example **without looking** at the solution, then compare.
- Keep one page of "all formulas of the chapter" with the meaning of each symbol. Revise it every few days.
- Practise a few numericals daily instead of many in one night.
- Draw a small diagram whenever a question is about forces, circuits or motion. A drawing often shows the answer.

## Theory questions

Learn definitions word for word and learn the unit of each quantity. For reasoning questions, give a short answer in three parts: the law or idea, the reason, and the conclusion.

Our Physics teachers set weekly numerical practice and mark it with feedback. A [free trial class](/enroll) will show you how it works.`,
  },
  {
    title: "Chemistry: Balancing Equations and Remembering Reactions",
    category: "STUDY_TIPS",
    topic: "Chemistry",
    daysAgo: 18,
    excerpt: "Practical ways to balance equations quickly, remember reactions and avoid the small slips that lose marks in Chemistry.",
    body: `Chemistry rewards students who practise a little every day. Many marks come from a few skills that you can train.

## Balancing chemical equations

1. Write the correct formulas first. Never change a formula to balance an equation. Only change the numbers in front.
2. Count the atoms of each element on both sides.
3. Balance the element that appears in the fewest places first, and leave hydrogen and oxygen for last.
4. Check again that every element matches on both sides.

Practise ten equations a day for a week and it becomes fast.

## Remember reactions with a table

Make a revision table with three columns: **reactants, products, conditions or observations**. Write only the important reactions of each chapter. Look at it often and cover one column to test yourself.

## Memorising symbols, valencies and the periodic table

- Write the first 20 elements with their symbols and valencies on one page and read it daily.
- Use small memory phrases for groups and trends, and make up your own so they stick.

## Numerical problems

For moles, concentration and gas laws, follow the same steps as in Physics: list what is given, write the formula, substitute with units, and state the answer with its unit.

> Always write the state symbols and conditions when the question asks for them, for example (aq), (g), heat or a catalyst. They are easy marks.

## Practical-based questions

Learn the apparatus, the steps and the colour changes or observations for each practical. Examiners like clear, short answers in the order things happen.

## Common slips

- Wrong charge on an ion.
- Forgetting to balance the equation after writing the products.
- Mixing up oxidation and reduction.
- Writing the observation but not the conclusion.

Revise short sections often instead of long ones rarely, and test yourself with past papers.`,
  },
  {
    title: "Biology: Diagrams, Labelling and Long Answers",
    category: "STUDY_TIPS",
    topic: "Biology",
    daysAgo: 16,
    excerpt: "Biology marks come from clear diagrams, correct terms and well-organised answers. Here is how to practise each.",
    body: `Biology is a subject where good presentation earns marks. A neat, labelled diagram and a well-organised answer often score better than a long one with no structure.

## Diagrams

- Practise the important diagrams of every chapter until you can draw them in two or three minutes.
- Use a sharp pencil and a ruler for label lines. Never let the lines cross.
- Label clearly in capital letters or neat handwriting, and give the diagram a title.
- Draw large enough that every part can be seen.

> Draw each key diagram three times from memory and compare it with the book. The third time you will notice what you keep forgetting.

## Learn the terms exactly

Biology uses precise words. "Osmosis", "diffusion" and "active transport" are not the same, and examiners expect the correct term. Keep a glossary at the end of your notebook with every new term and its definition, and read it often.

## Long answers

1. Begin with a definition or a one-line introduction.
2. Use short points or numbered steps, not one big paragraph.
3. Include a diagram when one helps.
4. End with an example or a conclusion.

## Making it stick

- Draw flow charts for processes such as digestion, circulation and photosynthesis.
- Teach a chapter aloud to a family member or a friend. If you cannot explain it, go back to it.
- Revise with questions, not only reading. Turn each heading into a question and answer it from memory.

## Last-week tip

Make one page for each chapter with the diagram, five key terms and three important points. These pages are your final revision.`,
  },
  {
    title: "Mathematics: A Practice Plan and How to Check Your Work",
    category: "STUDY_TIPS",
    topic: "Mathematics",
    daysAgo: 15,
    excerpt: "Mathematics is learned by doing. A simple practice plan, plus checking habits that save marks in the exam.",
    body: `You cannot learn Mathematics by reading it. You learn it by solving problems, getting stuck, and then understanding why. A steady plan works better than long sessions before the exam.

## A weekly practice plan

- **Learn:** read the concept and the solved examples, copying a few into your notebook with your own notes.
- **Practise:** solve the exercise questions without looking at the answers. Start with easy ones and move to harder ones.
- **Review:** each week, redo the questions you got wrong or could not solve.
- **Mix:** once a week, solve random questions from older chapters so you do not forget them.

Aim for at least 30 to 40 minutes of problem solving every day instead of three hours once a week.

## Learn formulas properly

Keep a formula sheet for each chapter and understand where each formula comes from. A formula you can rebuild is harder to forget. Write it, cover it, and test yourself.

## In the exam: show your working

> Marks are usually given for each step of the working, not just the final answer. Write every step clearly, in order.

## Check your answers

- Re-read the question to be sure you answered what was asked.
- Substitute your answer back into the equation when you can.
- Check signs (plus and minus) and units.
- Ask whether the answer is reasonable. A negative length or a probability above 1 is a warning.

## When you are stuck

Do not stare at one question for ten minutes. Move on, finish the rest, and come back. Often the idea appears while you are working on something else.

## Common mistakes to avoid

- Skipping steps and making a small arithmetic error.
- Copying the question wrongly from the paper.
- Leaving questions blank. Write the formula and the first step, because partial marks are often given.`,
  },
  {
    title: "Computer Science: Revising Programming and Theory",
    category: "STUDY_TIPS",
    topic: "Computer Science",
    daysAgo: 13,
    excerpt: "How to prepare for the theory and the programming parts of Computer Science, and how to practise code on paper.",
    body: `Computer Science has two kinds of questions: theory, which you learn and explain, and programming or logic, which you practise. Prepare for both.

## Theory

- Make short notes with headings for every chapter and learn definitions word for word.
- Draw diagrams for things such as the parts of a computer, networks and number systems.
- Use comparison tables, for example hardware and software, or RAM and ROM.
- Test yourself by covering the answer and explaining the term in your own words.

## Number systems and logic

Binary, decimal and hexadecimal conversions are easy marks if you practise. Do five conversions a day and show the steps. Learn the truth tables for AND, OR and NOT and draw a few logic circuits by hand.

## Programming

1. Understand the problem and write the steps in plain words first (an algorithm).
2. Draw a small flowchart if it is complicated.
3. Then write the code.
4. **Trace it with sample values** on paper, line by line, to check it works.

> Practise writing programs by hand. In the exam you will not have a computer, so you need to be comfortable writing correct syntax on paper.

## Common mistakes

- Missing brackets, semicolons or indentation.
- Using a variable before giving it a value.
- Off-by-one errors in loops.
- Not stating the output clearly in trace questions.

## Practise daily

Even twenty minutes of coding or tracing each day builds confidence. Revise past papers to see which question types are repeated.`,
  },
  {
    title: "English: Writing Essays, Letters and Comprehension Answers",
    category: "STUDY_TIPS",
    topic: "English",
    daysAgo: 12,
    excerpt: "Clear structure, simple language and careful reading earn the most marks in English. Here is how to practise each part of the paper.",
    body: `Good English marks do not need difficult words. They need clear structure, correct grammar and answers that match the question.

## Essays

1. Plan for two minutes before writing: choose three or four main points.
2. Write an **introduction** that states the topic, **two or three body paragraphs** with one idea each, and a **conclusion**.
3. Use simple, correct sentences. A long sentence with mistakes loses more marks than a short one that is right.
4. Leave a few minutes to read and fix spelling and punctuation.

Learn the outline of five or six common essay topics, such as education, technology, health and the environment, and practise writing each in full once.

## Letters and applications

Learn the format by heart: the address, date, salutation, subject line, body, closing and signature. Examiners often give marks just for the correct format, so these are the easiest marks in the paper.

## Comprehension

- Read the questions first, then read the passage.
- Underline the answer in the passage, then write it in **your own words** unless the question asks you to quote.
- Answer in complete sentences and keep to what is asked.

> Do not copy a whole paragraph as your answer. Find the exact lines that answer the question and rewrite them briefly.

## Grammar

Revise tenses, subject and verb agreement, articles, prepositions and active and passive voice. Do a few exercises a day and keep a list of the mistakes you often make.

## Vocabulary

Read a short article or a page of a story every day and write down five new words with their meaning. Use each word in a sentence of your own.`,
  },
  {
    title: "Time Management in the Exam Hall: A Plan for a Three-Hour Paper",
    category: "STUDY_TIPS",
    topic: "All subjects",
    daysAgo: 9,
    excerpt: "Many students know the answers but run out of time. A simple time plan and a few exam-hall habits fix that.",
    body: `Students often lose marks not because they do not know the answers but because they run out of time. A plan made before you enter the hall solves this.

## Before the paper starts

- Reach the centre early with your admission slip, ID, pens, pencils, ruler and a clean eraser.
- Read the instructions on the paper carefully, including which questions are compulsory and how many to attempt.
- Use the reading time, if any, to mark the questions you are surest about.

## Divide the time by the marks

A good rule is to spend roughly one minute per mark. If a question is worth 10 marks, give it about 10 minutes. Write the finishing time next to each section at the start so you can see at a glance if you are late.

> Aim to finish the main answers with 10 to 15 minutes left. That time is for checking, and it is often when students catch mistakes worth several marks.

## Choose the order wisely

- Start with the questions you know best. They build confidence and bank marks.
- Do not spend too long on one hard question. Mark it, move on, and return if there is time.
- Keep objective (multiple-choice) questions quick. Do not agonise over one.

## Presentation counts

Write clearly, leave margins, and number each answer exactly as in the question paper. Underline key terms. A neat paper makes the examiner's job easier.

## Do not leave blanks

Where you are unsure, write whatever you know: a definition, a formula or the first step. Partial marks are often given for it, while a blank earns nothing.

## Practise it

Do at least three timed practice papers before the exam. Time yourself and see where you are slow. Our [past papers page](/resources/past-papers) lists papers to practise with.`,
  },
  {
    title: "The Last 7 Days Before Your Exam: A Revision Checklist",
    category: "STUDY_TIPS",
    topic: "All subjects",
    daysAgo: 4,
    excerpt: "What to do in the final week: how to revise smartly, what to stop doing, and how to walk into the exam calm and ready.",
    body: `The last week is not for learning new chapters. It is for strengthening what you already know and keeping yourself calm and well.

## Days 7 to 5: find and fix gaps

- Go through your syllabus list and mark each chapter as strong, medium or weak.
- Spend most time on the medium chapters. They give the biggest improvement for the effort.
- Solve one past paper under timed conditions and mark it honestly.

## Days 4 to 2: revise actively

1. Use your short notes, formula pages, definitions and diagrams, not the whole book.
2. Test yourself by covering the page and writing from memory.
3. Re-read your "mistakes" notebook.
4. Solve another timed paper in your weakest subject.

## The day before

- Look over formulas, key definitions and diagrams for the next paper only.
- Prepare your bag: admission slip, ID, pens, pencils, ruler, eraser, a bottle of water.
- Know the route and time to the exam centre.
- Stop studying at a sensible hour and sleep.

## What to stop doing

- Starting a brand new chapter you have never seen.
- Studying all night. Tired students make careless mistakes.
- Discussing answers with friends after each paper. You cannot change them, so keep your focus on the next one.

> After each paper, take a short break, eat something and move on. Your next paper is the only one that matters now.

## On the morning of the exam

Have a proper breakfast, arrive early, breathe slowly, and read the instructions twice before you start. You have prepared, so trust your preparation.`,
  },
];

async function main() {
  const now = Date.now();
  let created = 0;
  for (const a of ARTICLES) {
    const slug = slugify(a.title);
    const exists = await db.resourceArticle.findUnique({ where: { slug }, select: { id: true } });
    if (exists) continue;
    await db.resourceArticle.create({
      data: {
        slug,
        title: a.title,
        excerpt: a.excerpt,
        body: a.body,
        category: a.category,
        topic: a.topic,
        isPublished: true,
        publishedAt: new Date(now - a.daysAgo * 24 * 3600_000),
      },
    });
    created += 1;
  }
  console.log(`Created ${created} article(s); ${ARTICLES.length - created} already existed.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
