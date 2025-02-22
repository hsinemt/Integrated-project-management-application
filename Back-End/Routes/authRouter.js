const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { transporter } = require('../Config/nodemailer');
const User = require('../Models/user');
require('dotenv').config();
const router = express.Router();

// Route to request a password reset
router.post('/reset-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).send('User with this email does not exist.');
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetOtp = token;
    user.resetOtpExpirationAt = Date.now() + 3600000; // 1 hour

    await user.save();

    const mailOptions = {
        to: user.email,
        from: 'hsinesignin@gmail.com',
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
               Please use the following OTP to reset your password:\n\n
               ${token}\n\n
               This OTP will expire in 1 hour.\n\n
               If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    transporter.sendMail(mailOptions)
        .then(() => {
            res.status(200).send('Reset password email sent.');
        })
        .catch((err) => {
            console.error('Error sending email:', err);
            res.status(500).send('Error sending email.');
        });
});

// Route to reset the password using the OTP
router.post('/reset/:token', async (req, res) => {
    const user = await User.findOne({
        resetOtp: req.params.token,
        resetOtpExpirationAt: { $gt: Date.now() },
    });

    if (!user) {
        return res.status(400).send('Password reset token is invalid or has expired.');
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    user.password = hashedPassword;
    user.resetOtp = '';
    user.resetOtpExpirationAt = 0;

    await user.save();

    res.status(200).send('Password has been reset.');
});

module.exports = router;