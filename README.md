Student Expense Tracker

A simple React Native app for tracking personal expenses. Users can add, edit, and delete expenses, filter by week or month, view totals by category, and see a bar chart visualization capped at $1000 per category. The app uses SQLite for local storage and react-native-chart-kit for analytics visualization.

Features

Add, edit, and delete expenses.

Filter expenses by This Week, This Month, or All.

View overall spending and totals by category.

Bar chart showing category totals (capped at $1000).

Local storage with SQLite for persistent data.

Screenshots

Add screenshots of your app here if you have them.

Installation

Clone the repository:

git clone https://github.com/YOUR_USERNAME/expense-tracker.git


Install dependencies:

npm install


Run the app:

npx expo start

GitHub Copilot Reflection

1. Where did Copilot help the most?

Copilot was most helpful generating boilerplate UI code, such as the FlatList for rendering expenses, and the chart configuration structure.

2. Where did you have to correct or modify Copilot’s output?

Copilot suggested hard-coded chart data and variable names that didn’t match my state, so I replaced them with categoryTotals and added a guard for empty data.

3. What did it get wrong or only partially right?

The chart dataset didn’t account for empty arrays, which caused errors. Some style suggestions didn’t match the app’s dark theme.

4. What surprised you about how Copilot interpreted your comments?

It correctly created a capped bar chart when I described “totals by category capped at 1000,” producing almost complete code without extra prompts.

5. Did small wording changes produce very different code?

Yes, specifying the cap explicitly versus just “bar chart by category” produced very different outputs: the first included the capping logic, the second did not.

6. One specific change you made by hand that improved the result:

Added a check for categoryTotals.length > 0 to prevent runtime errors, and adjusted chart colors to match the app’s theme.