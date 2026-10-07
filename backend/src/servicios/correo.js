// Envio del ticket por correo (RNF.9)
export function correoConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USUARIO && process.env.SMTP_CLAVE);
}

export async function enviarTicket({ correo, nombre, codigo, reserva, qrImagen }) {
  if (!correoConfigurado()) {
    console.log(`[correo simulado] Ticket ${codigo} para ${correo}`);
    return { enviado: false, simulado: true };
  }

  const { default: nodemailer } = await import('nodemailer');
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_CLAVE }
  });

  const adjuntos = qrImagen
    ? [{ filename: `${codigo}.png`, content: qrImagen.split(',')[1], encoding: 'base64', cid: 'qr-ticket' }]
    : [];

  try {
    await transporte.sendMail({
      from: process.env.SMTP_REMITENTE || process.env.SMTP_USUARIO,
      to: correo,
      subject: `Hotel Pacific Reef - Ticket de reserva ${codigo}`,
      html: `<p>Hola ${nombre},</p>
        <p>Tu reserva en la habitación ${reserva.habitacion.numero} del ${reserva.fecha_inicio} al ${reserva.fecha_fin} está confirmada.</p>
        <p>Código de ticket: <strong>${codigo}</strong>. Presenta este código QR en el check-in.</p>
        ${qrImagen ? '<img src="cid:qr-ticket" alt="Código QR del ticket" />' : ''}
        <p>Abono pagado: $${reserva.monto_pagado.toLocaleString('es-CL')} CLP. Saldo a pagar al llegar: $${reserva.saldo.toLocaleString('es-CL')} CLP.</p>`,
      attachments: adjuntos
    });
    return { enviado: true, simulado: false };
  } catch (error) {
    console.error('No se pudo enviar el correo del ticket:', error.message);
    return { enviado: false, simulado: false };
  }
}
