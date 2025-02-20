const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
    tls:{
        rejectUnauthorized: false,
    }
});
transporter.verify((error, success) => {
    if (error) {
        console.error("SMTP connection failed:", error);
    } else {
        console.log("SMTP connected successfully");
    }
});
// console.log("SMTP_USER:", process.env.SMTP_USER);
// console.log("SMTP_PASSWORD:", process.env.SMTP_PASSWORD);

module.exports ={transporter};

