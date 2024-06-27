const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'mohit.raghuwanshi@techinfini.com',
      pass: 'Tej#singh02'
    }
  });

const sendEmail = (to, subject, text) => {
    const mailOptions = {
        from: 'mohit.raghuwanshi@techinfini.com',
        to: to,
        subject: subject,
        text: text
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

module.exports = sendEmail;
