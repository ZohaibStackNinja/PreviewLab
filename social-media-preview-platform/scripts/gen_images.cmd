@echo off
REM Generate test images for end-to-end verification
python "%~dp0make_test_png.py" "%TEMP%\creative_a.png" 1200 675 10 186 181
python "%~dp0make_test_png.py" "%TEMP%\creative_b.png" 1080 1350 214 122 96
