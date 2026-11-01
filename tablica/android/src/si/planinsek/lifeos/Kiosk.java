package si.planinsek.lifeos;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Calendar;

/**
 * Namizje tablice: samo planer Life OS čez cel zaslon.
 * Podnevi je zaslon prižgan z izbrano svetlostjo, ponoči ugasne (tablica ostane prižgana),
 * zjutraj ga budilka spet prižge. Urnik in svetlost so v podatkih na strežniku (data.tablica).
 */
public class Kiosk extends Activity {
    static final String STREZNIK = "http://192.168.1.10:8090";
    private static final String STRAN = STREZNIK + "/tablica";

    // privzeto, dokler se nastavitve s strežnika ne preberejo
    static int vklop = 7 * 60, izklop = 22 * 60, svetlost = 60;

    private WebView web;
    private final Handler handler = new Handler();
    private boolean napaka;
    private Boolean dan;  // null = še ni določeno

    private final Runnable ponovi = new Runnable() {
        public void run() {
            if (napaka) {
                napaka = false;
                web.loadUrl(STRAN);
            }
        }
    };

    // vsako minuto: preveri dan/noč; vsakih 5 min: preberi nastavitve
    private int stevec;
    private final Runnable tik = new Runnable() {
        public void run() {
            if (stevec++ % 5 == 0) preberiNastavitve();
            uveljaviUrnik();
            handler.postDelayed(this, 60000);
        }
    };

    // stran vsako uro naložimo na novo (posodobitve, puščanje pomnilnika starega WebViewa)
    private final Runnable osvezi = new Runnable() {
        public void run() {
            web.loadUrl(STRAN);
            handler.postDelayed(this, 3600000);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        izklopiZaklep();
        sistemskeNastavitve();

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(14, 14, 18));
        web.setVerticalScrollBarEnabled(false);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAppCacheEnabled(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !url.startsWith(STREZNIK + "/");  // nikamor drugam
            }

            @Override
            public void onReceivedError(WebView view, int code, String opis, String url) {
                napaka = true;
                view.loadData("<html><body style='background:#0e0e12;color:#e8e8f0;"
                        + "font-family:sans-serif;text-align:center;padding-top:30%'>"
                        + "<h1>Povezujem s stre&#382;nikom &hellip;</h1>"
                        + "<p style='color:#777'>Preveri Wi-Fi. Poskusim znova &#269;ez 10 s.</p>"
                        + "</body></html>", "text/html", "utf-8");
                handler.removeCallbacks(ponovi);
                handler.postDelayed(ponovi, 10000);
            }
        });

        setContentView(web);
        web.loadUrl(STRAN);
        handler.post(tik);
        handler.postDelayed(osvezi, 3600000);
    }

    /** Ročna svetlost (samodejna povzroča utripanje) in kratek izklop zaslona za noč. */
    private void sistemskeNastavitve() {
        try {
            android.content.ContentResolver cr = getContentResolver();
            android.provider.Settings.System.putInt(cr, "screen_brightness_mode", 0);
            // "Ostani buden med polnjenjem" drži zaslon le zatemnjen in ponoči ne pusti ugasniti
            android.provider.Settings.System.putInt(cr, "stay_on_while_plugged_in", 0);
            android.provider.Settings.System.putInt(cr,
                    android.provider.Settings.System.SCREEN_OFF_TIMEOUT, 60000);
        } catch (Exception e) {
            // brez dovoljenja WRITE_SETTINGS: nastavi se prek adb
        }
    }

    @SuppressWarnings("deprecation")
    private void izklopiZaklep() {
        KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        km.newKeyguardLock("lifeos").disableKeyguard();
    }

    static boolean jeDan(int zdaj) {
        if (vklop == izklop) return true;
        if (vklop < izklop) return zdaj >= vklop && zdaj < izklop;
        return zdaj >= vklop || zdaj < izklop;  // npr. vklop 22:00, izklop 6:00
    }

    private void uveljaviUrnik() {
        Calendar c = Calendar.getInstance();
        boolean d = jeDan(c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE));
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        if (d) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            lp.screenBrightness = Math.max(0.05f, Math.min(1f, svetlost / 100f));
        } else {
            // ponoči: zaslon na najnižjo svetlost in naj ga sistem po časovni omejitvi ugasne
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            lp.screenBrightness = 0.02f;
        }
        getWindow().setAttributes(lp);
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LOW_PROFILE);
        dan = d;
        nastaviBudilko(this);
    }

    /** Budilka ob uri vklopa, ki zbudi tablico in prižge zaslon. */
    static void nastaviBudilko(Context ctx) {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        c.set(Calendar.HOUR_OF_DAY, vklop / 60);
        c.set(Calendar.MINUTE, vklop % 60);
        if (c.getTimeInMillis() <= System.currentTimeMillis()) c.add(Calendar.DAY_OF_MONTH, 1);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, 0, new Intent(ctx, Budilka.class),
                PendingIntent.FLAG_UPDATE_CURRENT);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        am.set(AlarmManager.RTC_WAKEUP, c.getTimeInMillis(), pi);
    }

    private static int minute(String hhmm, int privzeto) {
        try {
            String[] p = hhmm.split(":");
            int m = Integer.parseInt(p[0].trim()) * 60 + Integer.parseInt(p[1].trim());
            return m >= 0 && m < 24 * 60 ? m : privzeto;
        } catch (Exception e) {
            return privzeto;
        }
    }

    private void preberiNastavitve() {
        new Thread(new Runnable() {
            public void run() {
                try {
                    HttpURLConnection con = (HttpURLConnection) new URL(STREZNIK + "/api/data").openConnection();
                    con.setConnectTimeout(10000);
                    con.setReadTimeout(10000);
                    InputStream in = con.getInputStream();
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    in.close();
                    JSONObject data = new JSONObject(out.toString("UTF-8")).optJSONObject("data");
                    JSONObject t = data == null ? null : data.optJSONObject("tablica");
                    if (t == null) return;
                    vklop = minute(t.optString("vklop", ""), vklop);
                    izklop = minute(t.optString("izklop", ""), izklop);
                    svetlost = t.optInt("svetlost", svetlost);
                    handler.post(new Runnable() {
                        public void run() { uveljaviUrnik(); }
                    });
                } catch (Exception e) {
                    // brez povezave: ostanejo zadnje znane nastavitve
                }
            }
        }).start();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        uveljaviUrnik();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        uveljaviUrnik();
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_MENU
                || keyCode == KeyEvent.KEYCODE_SEARCH) {
            return true;  // kiosk: ne zapuščaj aplikacije
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        // namenoma nič
    }
}
