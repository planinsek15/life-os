#!/system/bin/busybox sh
# Zagon tablice brez Androida. Init ga ob vsakem zagonu požene kot root (storitev flash_recovery).
# 1) /system/bin ima pokvarjene vnose (sh, ...): čez njega pripne zdravo kopijo s sh -> busybox,
#    da adb shell deluje (upravljanje z računalnika).
# 2) Naloži gonilnika za dotik in Wi-Fi ter v Alpine chrootu zažene planer.
B=/system/bin/busybox
L=/cache/resi.log
R=/cache/alpine
echo "zagon $($B date)" >> $L

if [ ! -e /dev/resi/orig/busybox ]; then
  $B mkdir -p /dev/resi/orig /dev/resi/bin
  $B mount --bind /system/bin /dev/resi/orig >> $L 2>&1
  for f in /dev/resi/orig/*; do
    n=${f##*/}
    [ "$n" = sh ] && continue
    $B ln -s "$f" "/dev/resi/bin/$n" 2>> $L
  done
  $B ln -sf /dev/resi/orig/busybox /dev/resi/bin/sh
  $B mount --bind /dev/resi/bin /system/bin >> $L 2>&1
fi

[ -d $R/kiosk ] || exit 0
for d in proc sys dev; do
  $B grep -q " $R/$d " /proc/mounts || $B mount --bind /$d $R/$d
done
# /system je v chrootu viden kot /android/system (za vzdrževanje prek SSH)
$B mkdir -p $R/android/system
$B grep -q " $R/android/system " /proc/mounts || $B mount --bind /system $R/android/system
$B insmod $R/kiosk/goodix_touch.ko 2>> $L
$B insmod /system/vendor/modules/8192cu.ko 2>> $L
$B sleep 3
$B setsid $B chroot $R /bin/sh /kiosk/notri.sh < /dev/null > /dev/null 2>&1 &
echo "planer zagnan" >> $L
exit 0
