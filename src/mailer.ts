import nodemailer from 'nodemailer';

function generate_email(username:string, token:string)
{
    return `<p>Hello, ${username}.</p>

<p>You are receiving this email because someone requested the token for the GoldenBedrock account linked to this email. If this wasn't you, you can ignore this email.</p>

<h3>Your GoldenBedrock Token is: <code>${token}</code></h3>

<hr>

<p>This email was generated and sent from <a href="https://github.com/RealMCoded/GoldenBedrock">GoldenBedrock</a>.</p>`
}

async function send_recovery_email(username:string, token:string, email:string)
{
    const transport = nodemailer.createTransport({
        service: process.env.RECOVERY_MAILER_SERVICE,
        auth: {
            user: process.env.RECOVERY_MAILER_EMAIL,
            pass: process.env.RECOVERY_MAILER_PASSWORD
        }
    })

    const mail = {
        from: process.env.RECOVERY_MAILER_DISPLAY_EMAIL,
        to: email,
        subject: "GoldenBedrock Account Recovery",
        html: generate_email(username, token)
    }

    transport.sendMail(mail, (error, info)=> {
        if (error) {
            console.error(error);
        } else {
            console.info('Email sent: ' + info.response);
        }
    })
}

export { send_recovery_email }