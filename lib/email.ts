import nodemailer, { Transporter } from 'nodemailer';
import { ClinicRole } from './types';

let transporter: Transporter | undefined;

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = getEnv('SMTP_HOST');
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

function getRoleLabel(role: ClinicRole) {
  switch (role) {
    case 'clinic_admin':
      return 'Administrator clinică';
    case 'vet':
      return 'Veterinar';
    case 'assistant':
      return 'Asistent';
    default:
      return role;
  }
}

function getFromHeader() {
  const fromAddress = getEnv('MAIL_FROM_ADDRESS');
  const fromName = process.env.MAIL_FROM_NAME?.trim() || 'CanisVET';
  return `${fromName} <${fromAddress}>`;
}

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  await getTransporter().sendMail({
    from: getFromHeader(),
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });
}

export async function sendClinicInviteEmail(args: {
  to: string;
  clinicName: string;
  role: ClinicRole;
  inviteUrl: string;
  inviterName: string;
  expiresAt: Date;
}) {
  const roleLabel = getRoleLabel(args.role);
  const expiresLabel = args.expiresAt.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const subject = `Invitație în clinica ${args.clinicName}`;
  const text = [
    `Ai fost invitat(ă) în clinica ${args.clinicName} pe rolul ${roleLabel}.`,
    `Invitația a fost trimisă de ${args.inviterName}.`,
    `Acceptă invitația folosind acest link: ${args.inviteUrl}`,
    `Linkul expiră la data de ${expiresLabel}.`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h1 style="font-size:24px;margin:0 0 16px;">Invitație CanisVET</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">
        Ai fost invitat(ă) în clinica <strong>${args.clinicName}</strong> pe rolul
        <strong>${roleLabel}</strong>.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
        Invitația a fost trimisă de <strong>${args.inviterName}</strong>.
      </p>
      <a
        href="${args.inviteUrl}"
        style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;"
      >
        Acceptă invitația
      </a>
      <p style="font-size:13px;line-height:1.6;color:#475569;margin:20px 0 0;">
        Linkul expiră la data de ${expiresLabel}. Dacă nu ai solicitat acest acces, ignoră acest email.
      </p>
    </div>
  `;

  await sendTransactionalEmail({
    to: args.to,
    subject,
    text,
    html,
  });
}

function getAppUrl() {
  return process.env.APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

export async function sendVerificationEmail(args: {
  to: string;
  token: string;
  firstName: string | null;
}) {
  const appUrl = getAppUrl();
  const link = `${appUrl}/verify-email/${args.token}`;
  const text = [
    `Salut${args.firstName ? `, ${args.firstName}` : ''}!`,
    'Confirmă adresa de email pentru contul CanisVET.',
    link,
    'Linkul expiră peste 45 de minute.',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;">
      <h1>Confirmă adresa de email</h1>
      <p>Apasă butonul de mai jos pentru a activa accesul în CanisVET.</p>
      <a
        href="${link}"
        style="display:inline-block;margin-top:20px;padding:12px 18px;background:#0f172a;color:#fff;border-radius:12px;text-decoration:none;"
      >
        Confirmă emailul
      </a>
      <p style="margin-top:16px;font-size:12px;color:#475569;">
        Linkul expiră în 45 minute. Dacă nu ai cerut această confirmare, ignoră acest email.
      </p>
    </div>
  `;

  await sendTransactionalEmail({
    to: args.to,
    subject: 'Confirmă adresa ta de email CanisVET',
    text,
    html,
  });
}

export async function sendPasswordResetEmail(args: {
  to: string;
  token: string;
}) {
  const appUrl = getAppUrl();
  const link = `${appUrl}/reset-password/${args.token}`;
  const text = [
    'Am primit o cerere de resetare a parolei pentru contul tău CanisVET.',
    `Dacă ai cerut acest lucru, folosește linkul de mai jos: ${link}`,
    'Linkul expiră în 45 minute.',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;">
      <h1>Resetare parolă CanisVET</h1>
      <p>Dacă ai cerut resetarea parolei, apasă butonul de mai jos.</p>
      <a
        href="${link}"
        style="display:inline-block;margin-top:20px;padding:12px 18px;background:#0f172a;color:#fff;border-radius:12px;text-decoration:none;"
      >
        Resetează parola
      </a>
      <p style="margin-top:16px;font-size:12px;color:#475569;">
        Linkul expiră în 45 minute. Dacă nu ai cerut acest lucru, ignoră acest email.
      </p>
    </div>
  `;

  await sendTransactionalEmail({
    to: args.to,
    subject: 'Resetare parolă CanisVET',
    text,
    html,
  });
}
