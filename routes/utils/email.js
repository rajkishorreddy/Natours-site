const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Raja Kishor Reddy <${process.env.EMAIL_FROM}> `;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //Sendfrid
      // return nodemailer.createTransport({
      //   service:'SendGrid',
      //   auth:{
      //     user:
      //     pass:
      //   }
      // })
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    //send the actual email
    //1 render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    //2 define the email optins
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };
    //3 create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the natours family');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your Password reset token(valid for only 10 min)'
    );
  }
};
//ACTIVATE "LESS SECURE APP" OPTION IN THE GMAIL
// const sendEmail = async (options) => {
//   //1.create a transporter(a service that will send the email(ex:gmail))
//   // const transporter = nodemailer.createTransport({
//   //   host: process.env.EMAIL_HOST,
//   //   port: process.env.EMAIL_PORT,
//   //   auth: {
//   //     user: process.env.EMAIL_USERNAME,
//   //     pass: process.env.EMAIL_PASSWORD,
//   //   },
//   // });
//   //2.Define the email options
//   // const mailOptions = {
//   //   from: 'RajaKishorReddy <raja@gmail.com>',
//   //   to: options.email,
//   //   subject: options.subject,
//   //   text: options.message,
//   //html
//   //};
//   //3.actually send the email
//   //await transporter.sendMail(mailOptions);
// };
// // module.exports = sendEmail;
