const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const cors = require('cors');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) throw err;
  console.log('Database connected!');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);

  const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.query(query, [username, hashedPassword], (err, results) => {
    if (err) return res.status(500).send('Server error');
    res.status(200).send('User registered successfully');
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length === 0) return res.status(404).send('User not found');

    const user = results[0];
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) return res.status(401).send('Invalid password');

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: 86400 // 24 hours
    });

    res.status(200).send({ auth: true, token });
  });
});

app.post('/distribution', (req, res) => {
  const { user_id, amount, friends, spender, description, distribution } = req.body;

  const query = 'INSERT INTO distributions (user_id, amount, friends, spender, description, distribution) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [user_id, amount, friends, spender, description, JSON.stringify(distribution)], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Failed to save distribution');
    }
    res.status(200).send('Distribution saved successfully');
  });
});

app.get('/distributions/:userId', (req, res) => {
  const userId = req.params.userId;

  const query = 'SELECT * FROM distributions WHERE user_id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Failed to fetch distributions');
    }
    res.status(200).json(results);
  });
});

app.post('/send-distribution-email', async (req, res) => {
  const { friends, friendEmails, distribution } = req.body;

  if (!friends || !friendEmails || !distribution) {
    return res.status(400).json({ error: 'Missing required data.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  const createContent = (friend, distributionData) => {
    let content = `Friend Money Distribution\n`;
    content += `Friend: ${friend}\n`;

    for (const [spender, payments] of Object.entries(distributionData)) {
      content += `Spender: ${spender}\n`;
      let totalDue = 0;
      payments.forEach(payment => {
        content += `${spender} paid for ${payment.description}: ${payment.amount.toFixed(2)} (${payment.paid ? 'Paid' : 'Due'})\n`;
        if (!payment.paid) {
          totalDue += payment.amount;
        }
      });
      content += `Total amount due by ${spender}: ${totalDue.toFixed(2)}\n`;
    }

    return content;
  };

  const createPDF = (content) => {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.text(content);
      doc.end();
    });
  };

  const sendEmail = async (friend, email, distributionData) => {
    const content = createContent(friend, distributionData);
    const pdfBuffer = await createPDF(content);

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: `Money Distribution Details for ${friend}`,
      text: content,
      attachments: [{
        filename: 'distribution_details.pdf',
        content: pdfBuffer
      }]
    };

    return transporter.sendMail(mailOptions);
  };

  try {
    const emailPromises = friends.map((friend, index) =>
      sendEmail(friend, friendEmails[index], distribution[friend])
    );

    await Promise.all(emailPromises);

    res.status(200).json({ message: 'Emails sent successfully.' });
  } catch (error) {
    console.error('Failed to send emails:', error);
    res.status(500).json({ error: 'Failed to send emails.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
