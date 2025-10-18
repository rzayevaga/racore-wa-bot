#!/bin/bash
clear
echo "🤖 RACORE Bot Başladılır..."
echo "🧩 Team rzayeffdi"
echo "👑 Author: Rzayeff Ağa"
echo ""

# Session qovluğunu yoxla
if [ ! -d "session" ]; then
    echo "📁 Session qovluğu yaradılır..."
    mkdir session
fi

# Database faylını yoxla
if [ ! -f "racore.db" ]; then
    echo "🗃️ Database faylı yaradılır..."
    touch racore.db
fi

# Botu başlat
echo "🚀 RACORE Bot başladılır..."
node index.js
