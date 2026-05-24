import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (email, otp) => {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Your ENUM verification code",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>ENUM Verification</title>
      </head>
      <body style="margin:0;padding:0;background:#000;font-family:'Courier New',monospace;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="400" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #fff;padding:40px;">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <h1 style="color:#fff;font-size:36px;letter-spacing:-4px;margin:0;transform:scaleX(0.9);display:inline-block;">
                      E<em style="font-style:italic;font-weight:400;">N</em>UM
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <p style="color:#a3a3a3;font-size:11px;letter-spacing:3px;margin:0;text-transform:uppercase;">
                      Verification Code
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <div style="background:#111;border:1px solid #333;padding:20px 40px;display:inline-block;">
                      <span style="color:#fff;font-size:36px;letter-spacing:12px;font-family:'Courier New',monospace;font-weight:bold;">
                        ${otp}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <p style="color:#737373;font-size:11px;letter-spacing:1px;margin:0;">
                      This code expires in <strong style="color:#a3a3a3;">10 minutes</strong>.
                    </p>
                    <p style="color:#737373;font-size:11px;letter-spacing:1px;margin:8px 0 0;">
                      If you did not request this, please ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="border-top:1px solid #222;padding-top:24px;">
                    <p style="color:#404040;font-size:10px;letter-spacing:2px;margin:0;text-transform:uppercase;">
                      enum.live
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
};
