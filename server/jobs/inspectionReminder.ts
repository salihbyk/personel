import cron from 'node-cron';
import { db } from '@db';
import { vehicles } from '@db/schema';
import { differenceInDays } from 'date-fns';
import { sendVehicleInspectionReminder } from '../utils/mailer';

const REMINDER_DAYS = [20, 10, 3];

export function startInspectionReminderJob() {
  // Her gün sabah 9'da çalışacak
  cron.schedule('0 9 * * *', async () => {
    try {
      const allVehicles = await db.query.vehicles.findMany();
      const today = new Date();

      for (const vehicle of allVehicles) {
        const inspectionDate = new Date(vehicle.inspectionDate);
        const daysUntilInspection = differenceInDays(
          inspectionDate,
          today
        );

        if (REMINDER_DAYS.includes(daysUntilInspection)) {
          await sendVehicleInspectionReminder({
            name: vehicle.name,
            plate: vehicle.plate,
            inspectionDate
          }, daysUntilInspection);

          console.log(`Reminder sent for vehicle ${vehicle.plate} - ${daysUntilInspection} days remaining`);
        }
      }
    } catch (error) {
      console.error('Error in inspection reminder job:', error);
    }
  });
}