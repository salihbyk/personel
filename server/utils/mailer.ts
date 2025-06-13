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
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 15px 0;
      background-color: #f5f5f5;
      border-radius: 5px;
    }
    .logo {
      max-width: 220px;
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
      border-left: 4px solid #2c3e50;
    }
    .warning {
      color: #d63031;
      font-weight: bold;
      font-size: 16px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://europatrans.com.tr/wp-content/themes/transport/assets/images/logo.png" alt="Europa Trans Logo" class="logo">
      <h2>Araç Muayene Bildirimi</h2>
    </div>
    <div class="content">
      <p>Sayın İlgili,</p>
      <p>Araç muayene tarihi yaklaşan araç bilgileri aşağıdadır:</p>
      <div class="vehicle-info">
        <p><strong>Araç:</strong> {{vehicleName}}</p>
        <p><strong>Plaka:</strong> {{plate}}</p>
        <p><strong>Muayene Tarihi:</strong> {{inspectionDate}}</p>
        <p class="warning">⚠️ Muayene tarihine {{remainingDays}} gün kaldı!</p>
      </div>
      <p>Lütfen gerekli hazırlıkları yapınız.</p>
      <br>
      <p>Saygılarımızla,<br>Europa Trans Lojistik</p>
    </div>
    <div class="footer">
      <p>Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
      <p>© ${new Date().getFullYear()} Europa Trans Lojistik - Tüm Hakları Saklıdır</p>
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
  console.log(`Preparing email for vehicle: ${vehicle.name} (${vehicle.plate}), inspection date: ${vehicle.inspectionDate}, days remaining: ${daysRemaining}`);
  
  // Doğrulama kontrolleri
  if (!process.env.EMAIL_USER) {
    throw new Error('EMAIL_USER environment variable is not set');
  }
  
  if (!process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_PASSWORD environment variable is not set');
  }
  
  const html = template({
    vehicleName: vehicle.name,
    plate: vehicle.plate,
    inspectionDate: format(vehicle.inspectionDate, 'd MMMM yyyy', { locale: tr }),
    remainingDays: daysRemaining,
  });

  console.log(`Email template generated, sending from: ${process.env.EMAIL_USER} to: info@europatrans.com.tr`);
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'info@europatrans.com.tr',
      subject: `Araç Muayene Hatırlatması - ${vehicle.plate} - ${daysRemaining} Gün Kaldı`,
      html,
    });

    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Test mail gönderimi için fonksiyon
export async function sendTestMail() {
  console.log('Starting test mail process...');
  
  // Email credentials validation
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('Email credentials are missing: ', 
      !process.env.EMAIL_USER ? 'EMAIL_USER is missing' : '',
      !process.env.EMAIL_PASSWORD ? 'EMAIL_PASSWORD is missing' : '');
    return { 
      success: false, 
      message: "Email kimlik bilgileri eksik. Lütfen sistem yöneticisine başvurun." 
    };
  }
  
  console.log(`Using email: ${process.env.EMAIL_USER}`);
  
  const testVehicle = {
    name: "Test Araç",
    plate: "34TEST123",
    inspectionDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) // 20 gün sonrası
  };

  try {
    console.log(`Testing email with vehicle: ${testVehicle.name} (${testVehicle.plate})`);
    
    // Test the connection to Yandex mail server first
    console.log('Testing SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    
    // Send the test email
    const info = await sendVehicleInspectionReminder(testVehicle, 20);
    console.log('Test mail gönderildi:', info.messageId);
    return { 
      success: true, 
      message: "Test maili başarıyla gönderildi. Mail ID: " + info.messageId 
    };
  } catch (error: any) {
    console.error("Test mail gönderimi hatası:", error);
    
    // Provide more helpful error message based on the error type
    let errorMessage = error.message;
    
    if (error.code === 'EAUTH') {
      errorMessage = "Yandex mail sunucusu için kimlik doğrulama hatası. Kullanıcı adı veya şifre yanlış olabilir.";
    } else if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
      errorMessage = "Yandex mail sunucusuna bağlanılamıyor. İnternet bağlantınızı kontrol edin veya sunucu durum bilgilerini kontrol edin.";
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = "Mail sunucusuna bağlantı zaman aşımına uğradı. Daha sonra tekrar deneyin.";
    }
    
    return { 
      success: false, 
      message: errorMessage,
      details: error.toString(),
      code: error.code || 'UNKNOWN'
    };
  }
}