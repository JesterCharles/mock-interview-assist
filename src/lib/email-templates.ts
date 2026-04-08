export function getReportEmailHtml(firstName: string, lastInitial: string, strengthsHtml: string, improvementsHtml: string, interviewerName?: string) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
            .header { text-align: center; margin-bottom: 30px; padding: 20px 0; border-bottom: 2px solid #e5e7eb; }
            .content { background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #f3f4f6; }
            h2 { color: #4F46E5; margin: 0; font-size: 24px; letter-spacing: -0.025em; }
            h3 { color: #111827; font-size: 18px; margin-top: 24px; margin-bottom: 12px; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
            p { margin-bottom: 16px; color: #374151; }
            .highlight-box { background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Next Level Mock</h2>
          </div>
          <div class="content">
            <p style="font-size: 16px; font-weight: 500;">Hi ${firstName} ${lastInitial}.,</p>
            <p>Thank you for completing your recent technical mock interview. Attached to this email is your full, personalized PDF feedback report detailing your question-by-question performance.</p>
            
            <h3>Key Strengths</h3>
            <div class="highlight-box">
              ${strengthsHtml}
            </div>
            
            <h3>Areas for Improvement</h3>
            <div class="highlight-box" style="border-left-color: #f59e0b;">
              ${improvementsHtml}
            </div>
            
            <p style="margin-top: 30px;">Please review the attached PDF for a detailed breakdown of your scores and comprehensive feedback on each topic discussed.</p>
            <p>Best regards,<br><strong style="color: #111827;">${interviewerName || 'The Next Level Mock Team'}</strong></p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Next Level Mock. All rights reserved.
          </div>
        </body>
      </html>
    `;
  }
