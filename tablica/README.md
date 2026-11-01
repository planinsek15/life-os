# 🖼️ Stenska tablica

Stara tablica Prestigio (Allwinner A10, Android 4.0.3, 0,8 GB RAM) kot stenski planer za Life OS. Zgodba je v [ZGODBA.md](../ZGODBA.md#faza-5--stenska-tablica-in-kako-je-odpovedala).

| Mapa | Kaj je |
|---|---|
| [`android/`](android) | Kiosk aplikacija (Java): zažene se namesto domačega zaslona, pokaže Life OS v WebView, po urniku ugasne/prižge zaslon in nastavi svetlost. Gradnja v Dockerju brez Gradla: `KS_GESLO=... sudo -E bash zgradi.sh`. |
| [`linux/`](linux) | Ko je Android odpovedal: `planer.py` riše neposredno v framebuffer (1024×768), bere dotik in tipke, poveže Wi-Fi, kaže vreme (Open-Meteo), naloge, cilje in gumb »Poskusil sem«. Teče v Alpine Linux chrootu. |

Podpisni ključ, SSH ključi, zgrajeni APK in slike sistema namenoma niso v repozitoriju.
