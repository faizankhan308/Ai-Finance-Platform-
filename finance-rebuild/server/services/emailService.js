// =============================================
// EMAIL SERVICE - Nodemailer (replaces Resend)
// Sends budget alerts and monthly reports
// =============================================

const nodemailer = require("nodemailer");

// Create email transporter using Gmail
// This is the "connection" to Gmail's mail server
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail
    pass: process.env.EMAIL_PASS, // Gmail App Password (not regular password)
  },
});

// -----------------------------------------------
// Send Budget Alert Email
// Sent when user spends 80%+ of their budget
// -----------------------------------------------
async function sendBudgetAlertEmail({ to, userName, accountName, budgetAmount, totalExpenses, percentageUsed }) {
  const mailOptions = {
    from: `"Finance App" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `⚠️ Budget Alert for ${accountName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .body { padding: 30px; }
          .alert-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .stat { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .progress-bar { background: #e5e7eb; border-radius: 10px; height: 20px; margin: 15px 0; }
          .progress-fill { background: ${percentageUsed >= 90 ? '#ef4444' : '#f59e0b'}; height: 100%; border-radius: 10px; width: ${Math.min(percentageUsed, 100)}%; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏦 Finance App</h1>
            <p style="color: #e0e7ff; margin: 5px 0">Budget Alert</p>
          </div>
          <div class="body">
            <h2>Hi ${userName || "there"}! ⚠️</h2>
            <p>Your budget for <strong>${accountName}</strong> has reached <strong>${percentageUsed.toFixed(1)}%</strong>.</p>
            
            <div class="alert-box">
              <h3 style="margin: 0 0 10px 0; color: #92400e;">Budget Status</h3>
              <div class="stat"><span>Monthly Budget:</span><strong>$${parseFloat(budgetAmount).toFixed(2)}</strong></div>
              <div class="stat"><span>Amount Spent:</span><strong style="color: #ef4444;">$${parseFloat(totalExpenses).toFixed(2)}</strong></div>
              <div class="stat"><span>Remaining:</span><strong style="color: #10b981;">$${(budgetAmount - totalExpenses).toFixed(2)}</strong></div>
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
              <p style="text-align: center; margin: 5px 0; font-weight: bold;">${percentageUsed.toFixed(1)}% Used</p>
            </div>
            
            <p>💡 <strong>Tip:</strong> Review your recent transactions to identify areas where you can cut back.</p>
          </div>
          <div class="footer">
            <p>This is an automated alert from your Finance App.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// -----------------------------------------------
// Send Monthly Report Email
// Sent on 1st of every month with AI insights
// -----------------------------------------------
async function sendMonthlyReportEmail({ to, userName, month, stats, insights }) {
  const categoryRows = Object.entries(stats.byCategory || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) // Top 5 categories
    .map(([cat, amt]) => `
      <tr>
        <td style="padding: 8px; text-transform: capitalize;">${cat}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold;">$${parseFloat(amt).toFixed(2)}</td>
      </tr>
    `).join("");

  const insightsList = (insights || [])
    .map((insight) => `<li style="margin: 8px 0;">${insight}</li>`)
    .join("");

  const mailOptions = {
    from: `"Finance App" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `📊 Your Monthly Financial Report - ${month}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .body { padding: 30px; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 20px 0; }
          .stat-card { background: #f8fafc; border-radius: 8px; padding: 15px; text-align: center; }
          .stat-value { font-size: 22px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f1f5f9; padding: 10px 8px; text-align: left; }
          tr:nth-child(even) { background: #f9fafb; }
          .insights { background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏦 Finance App</h1>
            <p style="color: #e0e7ff; margin: 5px 0;">Monthly Report - ${month}</p>
          </div>
          <div class="body">
            <h2>Hello ${userName || "there"}! 👋</h2>
            <p>Here's your financial summary for <strong>${month}</strong>:</p>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value" style="color: #10b981;">$${parseFloat(stats.totalIncome || 0).toFixed(0)}</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 5px;">Total Income</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" style="color: #ef4444;">$${parseFloat(stats.totalExpenses || 0).toFixed(0)}</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 5px;">Total Expenses</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" style="color: #6366f1;">$${parseFloat((stats.totalIncome || 0) - (stats.totalExpenses || 0)).toFixed(0)}</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 5px;">Net Savings</div>
              </div>
            </div>

            ${categoryRows ? `
              <h3>Top Expense Categories</h3>
              <table>
                <tr><th>Category</th><th style="text-align: right;">Amount</th></tr>
                ${categoryRows}
              </table>
            ` : ""}

            ${insightsList ? `
              <div class="insights">
                <h3 style="margin: 0 0 15px 0;">🤖 AI-Powered Insights</h3>
                <ul style="margin: 0; padding-left: 20px;">${insightsList}</ul>
              </div>
            ` : ""}
          </div>
          <div class="footer">
            <p>Generated automatically by Finance App on the 1st of each month.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendBudgetAlertEmail, sendMonthlyReportEmail };
