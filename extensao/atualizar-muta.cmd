@echo off
rem Atualiza a extensao Muta nesta mesma pasta (dois cliques). Nao precisa abrir chrome://extensions:
rem com o painel do Muta aberto, a extensao percebe os arquivos novos e se recarrega sozinha.
rem Usa so o que ja vem no Windows 10/11: curl, tar e robocopy. Os prontuarios guardados na extensao nao sao apagados.
setlocal
set "DEST=%~dp0"
set "TMPZ=%TEMP%\muta-pje.zip"
set "TMPD=%TEMP%\muta-pje-novo"
echo Baixando a versao nova do Muta...
curl.exe -fsSL -o "%TMPZ%" "https://www.gabinete-cmt.com/extensao/muta-pje.zip"
if errorlevel 1 goto erro
if exist "%TMPD%" rmdir /s /q "%TMPD%"
mkdir "%TMPD%"
tar.exe -xf "%TMPZ%" -C "%TMPD%"
if errorlevel 1 goto erro
if not exist "%TMPD%\manifest.json" goto erro
rem copia tudo menos o manifest e este arquivo; o manifest vai por ultimo (e ele que avisa a extensao para recarregar)
robocopy "%TMPD%" "%DEST%." /E /NFL /NDL /NJH /NJS /NP /XF manifest.json atualizar-muta.cmd >nul
if errorlevel 8 goto erro
copy /y "%TMPD%\manifest.json" "%DEST%manifest.json" >nul
if errorlevel 1 goto erro
rmdir /s /q "%TMPD%" & del /q "%TMPZ%"
echo.
echo Pronto. Abra (ou deixe aberto) o painel do Muta: ele se recarrega sozinho em alguns segundos.
echo Recarregue tambem a aba do PJe.
timeout /t 6 >nul
exit /b 0
:erro
echo.
echo Nao foi possivel atualizar. Baixe o ZIP em https://www.gabinete-cmt.com/extensao/muta-pje.zip e extraia sobre esta pasta.
pause
exit /b 1
