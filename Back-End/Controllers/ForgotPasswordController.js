const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { transporter } = require('../Config/nodemailer');
const User = require('../Models/User');

exports.sendResetPasswordOTP = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('User with this email does not exist.');
        }

        const token = crypto.randomInt(1000, 9999);
        user.resetOtp = token;
        user.resetOtpExpirationAt = Date.now() + 3600000; // 1 hour
        await user.save();

        const mailOptions = {
            to: user.email,
            from: 'hsinesignin@gmail.com', // replace with env variable ideally
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
Please use the following OTP to reset your password:\n\n
${token}\n\n
This OTP will expire in 1 hour.\n\n
If you did not request this, please ignore this email and your password will remain unchanged.\n`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).send('Reset password email sent.');
    } catch (error) {
        console.error('Error in sendResetPasswordOTP:', error);
        res.status(500).send('Internal server error.');
    }
};

exports.resetPassword = async (req, res) => {
    const { password, otp } = req.body;

    try {
        const user = await User.findOne({
            resetOtp: otp,
            resetOtpExpirationAt: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).send('Invalid or expired OTP.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;
        user.resetOtp = '';
        user.resetOtpExpirationAt = 0;

        await user.save();
        res.status(200).send('Password has been reset.');
    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).send('Internal server error.');
    }
};