import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      max-width: 200px;
      height: auto;
    }
    .content {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
    }
    .vehicle-info {
      margin-top: 20px;
      padding: 15px;
      background: #fff;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .warning {
      color: #d63031;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://your-logo-url.com/logo.png" alt="Europa Trans Logo" class="logo">
      <h2>Araç Muayene Bildirimi</h2>
    </div>
    <div class="content">
      <p>Sayın İlgili,</p>
      <p>Araç muayene tarihi yaklaşan araç bilgileri aşağıdadır:</p>
      <div class="vehicle-info">
        <p><strong>Araç:</strong> {{vehicleName}}</p>
        <p><strong>Plaka:</strong> {{plate}}</p>
        <p><strong>Muayene Tarihi:</strong> {{inspectionDate}}</p>
        <p class="warning">{{remainingDays}} gün kaldı!</p>
      </div>
      <p>Lütfen gerekli hazırlıkları yapınız.</p>
      <br>
      <p>Saygılarımızla,<br>Europa Trans</p>
    </div>
  </div>
</body>
</html>
`;

const template = Handlebars.compile(emailTemplate);

const transporter = nodemailer.createTransport({
  host: 'smtp.yandex.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVehicleInspectionReminder(vehicle: {
  name: string;
  plate: string;
  inspectionDate: Date;
}, daysRemaining: number) {
  const html = template({
    vehicleName: vehicle.name,
    plate: vehicle.plate,
    inspectionDate: format(vehicle.inspectionDate, 'd MMMM yyyy', { locale: tr }),
    remainingDays: daysRemaining,
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: 'info@europatrans.com.tr',
    subject: `Araç Muayene Hatırlatması - ${vehicle.plate} - ${daysRemaining} Gün Kaldı`,
    html,
  });

  console.log('Email sent:', info.messageId);
  return info;
}

// Test mail gönderimi için fonksiyon
export async function sendTestMail() {
  const testVehicle = {
    name: "Test Araç",
    plate: "34TEST123",
    inspectionDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) // 20 gün sonrası
  };

  try {
    const info = await sendVehicleInspectionReminder(testVehicle, 20);
    console.log('Test mail gönderildi:', info.messageId);
    return { success: true, message: "Test maili başarıyla gönderildi" };
  } catch (error: any) {
    console.error("Test mail gönderimi hatası:", error);
    return { success: false, message: error.message };
  }
}