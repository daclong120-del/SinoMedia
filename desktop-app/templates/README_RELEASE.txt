SinoMedia Desktop Release Scaffold
==================================

Day la thu muc release scaffold cua ung dung SinoMedia Desktop.
Thu muc nay chua cau truc thu muc dung chuan va cac script launcher de van hanh ung dung desktop.

De cap nhat phien ban day du (Full Mode), vui long chay script build:
PowerShell -ExecutionPolicy Bypass -File .\scripts\build-runtime-package.ps1 -Mode Full

Luu y:
- Thu muc app/ se chua Dashboard Server (Next.js Standalone).
- Thu muc worker/ se chua Crawler Worker (crawler-pipeline).
- Thu muc runtime/ se chua Node.exe embedded runtime.
- File config/env.template se dung de tao file .env de cau hinh.
