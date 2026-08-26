const { Resend } = require("resend");
const config = require("../config");

const resend = new Resend(config.resendApiKey);

async function sendVerificationEmail({
  email,
  fullName,
  verificationToken,
}) {
  const backendOrigin = config.backendOrigin || "http://localhost:4000";

  const verificationUrl = `${backendOrigin}/api/auth/verify-email?token=${encodeURIComponent(
    verificationToken
  )}`;

  // Print link directly to server terminal for instant local testing
  console.log("\n=======================================================");
  console.log("📬 VERIFICATION LINK GENERATED:");
  console.log(verificationUrl);
  console.log("=======================================================\n");

  const { data, error } = await resend.emails.send({
    from: config.emailFrom,
    to: [email],
    subject: "Verify your Meridian account",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Verify your Meridian account</title>
        </head>

        <body style="
          margin: 0;
          padding: 0;
          background: #f5f5f0;
          font-family: Arial, sans-serif;
        ">
          <div style="
            max-width: 600px;
            margin: 40px auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
          ">

            <h1 style="margin-top: 0;">
              Welcome to Connec
            </h1>

            <p>
              Hi ${fullName},
            </p>

            <p>
              Thanks for creating your Connec account.
              Please verify your email address by clicking the button below.
            </p>

            <div style="margin: 30px 0;">
              <a
                href="${verificationUrl}"
                style="
                  display: inline-block;
                  padding: 14px 24px;
                  background: #166534;
                  color: white;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: bold;
                "
              >
                Verify My Email
              </a>
            </div>

            <p>
              This verification link will expire in 24 hours.
            </p>

            <p style="color: #666; font-size: 14px;">
              If you didn't create this account, you can safely ignore this email.
            </p>

            <hr style="
              border: none;
              border-top: 1px solid #eee;
              margin: 30px 0;
            " />

            <p style="color: #999; font-size: 12px;">
              Connec
            </p>

          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error("Failed to send verification email");
  }

  console.log("Verification email sent:", data?.id);

  return data;
}

module.exports = {
  sendVerificationEmail,
};