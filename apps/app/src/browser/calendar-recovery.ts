import {calendarDocument} from './calendar-store';
import {openDomainRecovery} from './domain-recovery';
export function openCalendarRecovery(){openDomainRecovery(calendarDocument,'calendar','App calendar recovery','Download a backup first.');}
