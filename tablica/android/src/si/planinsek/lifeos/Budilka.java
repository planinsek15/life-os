package si.planinsek.lifeos;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;

/** Ob uri vklopa (in po zagonu) prižge zaslon in odpre planer. */
public class Budilka extends BroadcastReceiver {
    @Override
    @SuppressWarnings("deprecation")
    public void onReceive(Context ctx, Intent intent) {
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = pm.newWakeLock(PowerManager.FULL_WAKE_LOCK
                | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE, "lifeos:vklop");
        wl.acquire(10000);  // Kiosk nato sam drži zaslon prižgan (FLAG_KEEP_SCREEN_ON)

        Intent i = new Intent(ctx, Kiosk.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        ctx.startActivity(i);
        Kiosk.nastaviBudilko(ctx);
    }
}
