from datetime import date as date_type
from datetime import datetime, time, timezone

from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

from common.timezone import normalize_timezone_name
from zoneinfo import ZoneInfo


def build_day_section_trigger(
    *,
    section_date: date_type,
    cron_expr: str,
    timezone_name: str,
):
    timezone_info = ZoneInfo(normalize_timezone_name(timezone_name))
    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(timezone_info)

    if now_local.date() > section_date:
        return None

    start_of_day = datetime.combine(section_date, time.min, tzinfo=timezone_info)
    end_of_day = datetime.combine(section_date, time.max, tzinfo=timezone_info)
    cron_parts = cron_expr.split()
    if len(cron_parts) != 5:
        raise ValueError(f"Invalid cron expression: {cron_expr}")

    minute, hour, day, month, day_of_week = cron_parts
    trigger = CronTrigger(
        minute=minute,
        hour=hour,
        day=day,
        month=month,
        day_of_week=day_of_week,
        timezone=timezone_info,
        start_date=start_of_day,
        end_date=end_of_day,
    )

    next_fire_time = trigger.get_next_fire_time(None, now_local)
    if next_fire_time is not None:
        return trigger

    if now_local.date() == section_date:
        return DateTrigger(run_date=now_utc)

    return None
