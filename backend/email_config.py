import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

def get_mail_config() -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=os.getenv("SMTP_USER", ""),
        MAIL_PASSWORD=os.getenv("SMTP_PASSWORD", ""),
        MAIL_FROM=os.getenv("SMTP_USER", ""),
        MAIL_PORT=int(os.getenv("SMTP_PORT", "587")),
        MAIL_SERVER=os.getenv("SMTP_HOST", "smtp.gmail.com"),
        MAIL_FROM_NAME="KindLink",
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
    )

async def send_reset_email(to_email: str, reset_link: str) -> None:
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Reset your password</title>
    </head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
                   style="background:#ffffff;border-radius:20px;overflow:hidden;
                          box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Header -->
              <tr>
                <td style="background:#4f46e5;padding:36px 40px;text-align:center;">
                  <div style="display:inline-flex;align-items:center;gap:10px;">
                    <span style="font-size:28px;">🤝</span>
                    <span style="color:#ffffff;font-size:22px;font-weight:700;
                                 letter-spacing:-0.5px;">KindLink</span>
                  </div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px 40px 32px;">
                  <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;font-weight:700;">
                    Reset your password
                  </h1>
                  <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                    We received a request to reset the password for your KindLink account.
                    Click the button below to choose a new password. This link is valid for
                    <strong style="color:#0f172a;">15 minutes</strong>.
                  </p>

                  <div style="text-align:center;margin:32px 0;">
                    <a href="{reset_link}"
                       style="display:inline-block;background:#4f46e5;color:#ffffff;
                              font-size:15px;font-weight:600;text-decoration:none;
                              padding:14px 36px;border-radius:12px;
                              box-shadow:0 4px 12px rgba(79,70,229,0.35);">
                      Reset Password
                    </a>
                  </div>

                  <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                    If you didn't request a password reset, you can safely ignore this email.
                    Your password will not change.
                  </p>
                </td>
              </tr>

              <!-- Link fallback -->
              <tr>
                <td style="padding:0 40px 32px;">
                  <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;">
                    <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">
                      Button not working? Copy this link into your browser:
                    </p>
                    <p style="margin:0;font-size:12px;color:#4f46e5;word-break:break-all;">
                      {reset_link}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;padding:20px 40px;text-align:center;
                           border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:12px;color:#94a3b8;">
                    © 2025 KindLink · Connecting communities through kindness
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """
    message = MessageSchema(
        subject="Reset your KindLink password",
        recipients=[to_email],
        body=html,
        subtype=MessageType.html,
    )
    fm = FastMail(get_mail_config())
    await fm.send_message(message)
