import cron from 'node-cron';
import { db } from '@db';
import { vehicles } from '@db/schema';
import { differenceInDays, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { sendVehicleInspectionReminder } from '../utils/mailer';

const REMINDER_DAYS = [20, 10, 3];

export function startInspectionReminderJob() {
  // Her gün sabah 9'da çalışacak
  cron.schedule('0 9 * * *', async () => {
    console.log('Starting daily vehicle inspection reminder check:', 
      format(new Date(), 'dd MMMM yyyy HH:mm:ss', { locale: tr }));
    
    try {
      // Çevre değişkenleri kontrol et
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('Email credentials missing, inspection reminders will not be sent');
        return;
      }
      
      const allVehicles = await db.query.vehicles.findMany();
      console.log(`Found ${allVehicles.length} vehicles to check for reminders`);
      
      const today = new Date();
      let remindersSent = 0;
      let remindersSkipped = 0;
      
      for (const vehicle of allVehicles) {
        try {
          const inspectionDate = new Date(vehicle.inspectionDate);
          const daysUntilInspection = differenceInDays(
            inspectionDate,
            today
          );
          
          // Günlük log
          if (daysUntilInspection <= 30) {
            console.log(`Vehicle ${vehicle.name} (${vehicle.plate}) has inspection in ${daysUntilInspection} days on ${format(inspectionDate, 'dd.MM.yyyy')}`);
          }

          if (REMINDER_DAYS.includes(daysUntilInspection)) {
            console.log(`Sending reminder for vehicle ${vehicle.name} (${vehicle.plate}) - ${daysUntilInspection} days remaining`);
            
            await sendVehicleInspectionReminder({
              name: vehicle.name,
              plate: vehicle.plate,
              inspectionDate
            }, daysUntilInspection);

            console.log(`✅ Reminder sent for vehicle ${vehicle.plate} - ${daysUntilInspection} days remaining`);
            remindersSent++;
          } else {
            remindersSkipped++;
          }
        } catch (vError) {
          console.error(`Error processing vehicle ${vehicle.plate}:`, vError);
        }
      }
      
      console.log(`Inspection reminder job completed: ${remindersSent} reminders sent, ${remindersSkipped} vehicles skipped`);
    } catch (error) {
      console.error('Fatal error in inspection reminder job:', error);
    }
  });
  
  console.log('Vehicle inspection reminder job scheduled for 9:00 AM daily');
}