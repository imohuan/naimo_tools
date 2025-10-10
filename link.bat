@echo off
REM 创建符号链接
REM 注意：此命令需要管理员权限

REM 文件的符号链接
@REM powershell -Command "New-Item -ItemType SymbolicLink -Path 'main.log' -Target 'C:\Users\IMOHUAN\AppData\Roaming\Electron\logs\main.log' -Force"

@REM 在编辑器中快捷的访问Electron的数据目录
powershell -Command "New-Item -ItemType SymbolicLink -Path links -Target 'C:\Users\IMOHUAN\AppData\Roaming\Electron' -Force"
powershell -Command "New-Item -ItemType SymbolicLink -Path temps -Target 'C:\Users\IMOHUAN\AppData\Local\Temp\naimo' -Force"

echo 符号链接创建完成！
pause

