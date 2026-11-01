#!/bin/sh
# Teče v Alpine chrootu na tablici (/cache/alpine): Wi-Fi, ura, planer.
export PATH=/usr/sbin:/usr/bin:/sbin:/bin HOME=/root
export TZ=CET-1CEST,M3.5.0,M10.5.0/3
K=/kiosk
mkdir -p /run /var/run/wpa_supplicant /tmp

ip link set wlan0 up
wpa_supplicant -B -i wlan0 -c $K/wpa.conf -D wext -P /run/wpa.pid >> $K/omrezje.log 2>&1
udhcpc -i wlan0 -b -p /run/udhcpc.pid -s /usr/share/udhcpc/default.script >> $K/omrezje.log 2>&1

# vzdrževanje prek Wi-Fi: SSH samo s ključem (brez gesel), ssh root@192.168.1.20
chown -R 0:0 /root /etc/dropbear
dropbear -R -s -g -p 22 >> $K/omrezje.log 2>&1

# ura: po prvi povezavi nastavi čas, nato ga drži usklajenega
( sleep 15; ntpd -n -p 0.si.pool.ntp.org -p 1.si.pool.ntp.org >> $K/omrezje.log 2>&1 ) &

while true; do
  [ -f $K/planer.log ] && [ "$(wc -c < $K/planer.log)" -gt 1000000 ] && mv $K/planer.log $K/planer.log.1
  python3 -u $K/planer.py >> $K/planer.log 2>&1
  sleep 3
done
