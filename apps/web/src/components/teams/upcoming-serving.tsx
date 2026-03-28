import { ScheduleRow } from "./schedule-row";

type ScheduleItem = {
  id: string;
  positionName: string | null;
  status: "CONFIRMED" | "UNCONFIRMED" | "DECLINED";
  sortDate: Date | string;
  dates: string;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  planTimes?: {
    id: string;
    name: string | null;
    timeType: string | null;
    startsAt: Date | string | null;
    endsAt: Date | string | null;
  }[];
};

type UpcomingServingProps = {
  schedules: ScheduleItem[];
};

export function UpcomingServing({ schedules }: UpcomingServingProps) {
  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <ScheduleRow key={schedule.id} schedule={schedule} />
      ))}
    </div>
  );
}
