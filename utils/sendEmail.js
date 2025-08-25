const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOpt = {
    from: "E-shop App <aymengenius@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
        html: options.html, // <-- Add this line

  };

  await transporter.sendMail(mailOpt);
};

module.exports = sendEmail;
