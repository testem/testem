@echo off
REM FOR %%dir IN (jasmine_custom jasmine_requirejs jasmine_simple qunit_simple) DO ECHO %%dir
for /f %%a in ('dir /ad /b examples') do call :testem %%a

exit /b

rem test'em for one example
:testem
echo "Testing %1..."
cd examples\%1
node ..\..\testem.js ci
cd ..\..
exit /b