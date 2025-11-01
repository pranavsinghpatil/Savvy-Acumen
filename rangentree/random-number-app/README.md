# GRE Quant Generator

This is a web application built with Next.js that helps you practice for the GRE Quantitative Reasoning section by generating random questions from a configurable question bank.

## Features

*   **Random Question Generation:** Get a random question from a wide range of topics and sub-topics.
*   **Progress Tracking:** Mark questions as "Done" to keep track of what you've completed.
*   **Bookmarking:** Save questions for later review.
*   **Skip Questions:** Skip questions you don't want to answer immediately.
*   **Data Export:** Download your progress, including the status of all questions (Remaining, Done, Bookmarked, Skipped), as a CSV file.
*   **Customizable Configuration:** Access settings to customize the question topics and the number of questions in each subgroup.

## How to Use

1.  **Generate a Question:** Click the "Generate Random" button to get a new question.
2.  **Answer and Track:**
    *   Click **Done** if you have completed the question.
    *   Click **Skip** to move to the next question without marking the current one as done.
    *   Click **Bookmark** to save the question for later.
3.  **View Bookmarks:** Click "Show Bookmarks" to see your saved questions.
4.  **Download Data:** Click "Download Data" to get a CSV file of your progress.

## Settings

You can customize the question bank by clicking on the **Settings** icon. To access the settings, you will need to enter an authentication key.

**Authentication Key:** `randombuiltbypranav`

In the settings, you can:
*   View statistics about the question bank.
*   Reset all your progress data (done, skipped, and bookmarked questions).

## Question Bank

The questions are based on the GRE Premium Quant Question Banks from GRE Prep Club. You can find the original question bank at the following link:

[GRE Premium Quant Question Banks (Topic Wise) - 2700+ Questions](https://gre.myprepclub.com/forum/gre-premium-quant-question-banks-topic-wise-2700-questions-34207.html#p116113)

## Tech Stack

*   [Next.js](https://nextjs.org/)
*   [React](https://react.dev/)
*   [TypeScript](https://www.typescriptlang.org/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [Lucide React](https://lucide.dev/guide/packages/lucide-react) for icons.