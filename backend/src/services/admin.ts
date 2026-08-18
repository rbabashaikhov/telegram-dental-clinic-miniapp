import type { Providers } from '../providers/types.js';
import type { AdminDashboard } from '../types.js';
import { refreshRecallStatuses } from './recall.js';
import { todayDateString } from './time.js';

export function getAdminDashboard(providers: Providers, now = new Date()): AdminDashboard {
  refreshRecallStatuses(providers, now);
  const today = todayDateString(now);
  const todays = providers.appointments.list({ date: today });
  const upcoming = providers.appointments.list({ from: today }).filter(
    (row) => row.status === 'scheduled' || row.status === 'confirmed',
  );
  const unscheduled = providers.treatmentPlans.listUnscheduled(today);
  const plans = providers.treatmentPlans.list();
  const due = providers.recalls.list({ status: 'due' });

  return {
    today,
    appointments: {
      today: todays.length,
      confirmed: todays.filter((row) => row.status === 'confirmed').length,
      completed: todays.filter((row) => row.status === 'completed').length,
      cancelled: todays.filter((row) => row.status === 'cancelled').length,
      no_show: todays.filter((row) => row.status === 'no_show').length,
    },
    booked_revenue: upcoming.reduce((sum, row) => sum + row.price, 0),
    treatment_plans_in_progress: plans.filter((plan) => plan.status === 'in_progress').length,
    unscheduled_treatment_value: unscheduled.reduce((sum, row) => sum + row.item.estimated_price, 0),
    unscheduled_count: unscheduled.length,
    recall_due: due.length,
    funnel: {
      created: plans.length,
      accepted: plans.filter((plan) => plan.status === 'accepted' || plan.status === 'in_progress' || plan.status === 'completed')
        .length,
      in_progress: plans.filter((plan) => plan.status === 'in_progress').length,
      completed: plans.filter((plan) => plan.status === 'completed').length,
    },
  };
}
