@echo off
REM FlowCounts Password Reminder Email Script
REM Run this script daily via Windows Task Scheduler

cd /d "%~dp0"
python manage.py send_password_reminders

REM Log the execution
echo %date% %time% - Password reminders sent >> password_reminders.log

