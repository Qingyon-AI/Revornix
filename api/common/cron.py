from datetime import datetime

def time_to_cron(time_str):
    # 将时间字符串转换为 datetime 对象
    time_obj = datetime.strptime(time_str, "%H:%M:%S")
    # 提取小时和分钟
    hour = time_obj.hour
    minute = time_obj.minute
    second = time_obj.second
    # 构建 cron 表达式
    cron_expression = f"{second} {minute} {hour} * * ?"
    return cron_expression

def cron_to_time(cron_expression):
    # 解析 cron 表达式
    parts = cron_expression.split()
    if len(parts) != 6:
        raise ValueError("Invalid cron expression format")
    second = int(parts[0])
    minute = int(parts[1])
    hour = int(parts[2])
    # 将小时和分钟格式化为时间字符串
    time_str = f"{hour:02d}:{minute:02d}:{second:02d}"
    return time_str
