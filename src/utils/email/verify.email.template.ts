export const verifyEmail = ({
  otp,
  title,
}: {
  otp: number;
  title: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        background: #f9fafb;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: 30px auto;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        overflow: hidden;
      }
      .header {
        text-align: center;
        padding: 25px 20px;
        background: #630E2B;
        color: #fff;
      }
      .header h2 {
        margin: 0;
        font-size: 26px;
      }
      .content {
        padding: 30px 40px;
        text-align: center;
      }
      .content h1 {
        color: #630E2B;
        margin-bottom: 15px;
        font-size: 22px;
      }
      .otp-box {
        display: inline-block;
        padding: 14px 28px;
        background: #630E2B;
        color: #fff;
        border-radius: 8px;
        font-size: 24px;
        font-weight: bold;
        letter-spacing: 4px;
        margin: 20px 0;
      }
      .footer {
        padding: 20px;
        text-align: center;
        background: #f3f4f6;
        font-size: 14px;
        color: #555;
      }
      .socials img {
        margin: 0 8px;
        width: 32px;
        height: 32px;
      }
      a { text-decoration: none; color: inherit; }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Header -->
      <div class="header">
        <h2>${title}</h2>
      </div>

      <!-- Content -->
      <div class="content">
        <p>Please use the OTP below to proceed:</p>
        <div class="otp-box">${otp}</div>
        <p>If you didn’t request this, please ignore this email.</p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Stay connected</p>
        <div class="socials">
          <a href="${process.env.facebookLink}">
            <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35062_erj5dx.png" alt="Facebook" />
          </a>
          <a href="${process.env.instegram}">
            <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35063_zottpo.png" alt="Instagram" />
          </a>
          <a href="${process.env.twitterLink}">
            <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group_35064_i8qtfd.png" alt="Twitter" />
          </a>
        </div>
      </div>
    </div>
  </body>
</html>`;
};
