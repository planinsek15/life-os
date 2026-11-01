# Prenese šifrirano varnostno kopijo s strežnika "doma" na D:\Varnostne-kopije\doma (samo nove datoteke).
# Teče kot načrtovano opravilo »Kopija strežnika doma« ob 03:30 ali ob prvem vklopu po tem.
$ErrorActionPreference = 'Stop'
$cilj   = 'D:\Varnostne-kopije\doma\restic'
$dnevnik = 'D:\Varnostne-kopije\doma\prenos.log'
$ntfy   = 'https://doma.TVOJ-TAILNET.ts.net/moja-tema'

function Zapisi($t) { Add-Content -Path $dnevnik -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $t) -Encoding UTF8 }
function Obvesti($naslov, $besedilo) {
    try { Invoke-RestMethod -Uri $ntfy -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($besedilo)) -Headers @{ Title = $naslov; Priority = '4'; Tags = 'floppy_disk' } -TimeoutSec 15 | Out-Null } catch { }
}

New-Item -ItemType Directory -Force -Path $cilj | Out-Null
try {
    # 1) seznam datotek na strežniku (pot|velikost)
    $vrstice = & ssh -o BatchMode=yes -o ConnectTimeout=15 doma "cd /srv/kopije/restic && find . -type f -printf '%P|%s\n'; echo ZADNJA=`$(cat /srv/kopije/zadnja-uspesna)"
    if ($LASTEXITCODE -ne 0) { throw "strežnik ni dosegljiv (ssh koda $LASTEXITCODE)" }
    $zadnja = ($vrstice | Where-Object { $_ -like 'ZADNJA=*' }) -replace 'ZADNJA=', ''
    $oddaljene = @{}
    foreach ($v in $vrstice) { if ($v -match '^(.+)\|(\d+)$') { $oddaljene[$Matches[1]] = [int64]$Matches[2] } }
    if ($oddaljene.Count -eq 0) { throw 'na strežniku ni datotek kopije' }

    # 2) kaj manjka ali je drugačno
    $manjka = foreach ($p in $oddaljene.Keys) {
        $lok = Join-Path $cilj ($p -replace '/', '\')
        if (-not (Test-Path -LiteralPath $lok) -or (Get-Item -LiteralPath $lok).Length -ne $oddaljene[$p]) { $p }
    }

    # 3) prenos manjkajočih (tar prek ssh)
    if ($manjka) {
        $seznam = Join-Path $env:TEMP 'kopija-seznam.txt'
        [IO.File]::WriteAllText($seznam, (($manjka -join "`n") + "`n"))
        & scp -q -o BatchMode=yes $seznam 'doma:/tmp/kopija-seznam.txt'
        if ($LASTEXITCODE -ne 0) { throw 'pošiljanje seznama ni uspelo' }
        & cmd /c "ssh -o BatchMode=yes doma `"tar cf - -C /srv/kopije/restic -T /tmp/kopija-seznam.txt && rm -f /tmp/kopija-seznam.txt`" | tar xf - -C `"$cilj`""
        if ($LASTEXITCODE -ne 0) { throw "prenos ni uspel (koda $LASTEXITCODE)" }
    }

    # 4) odstrani datoteke, ki jih na strežniku ni več (restic jih je počistil)
    $odvec = Get-ChildItem -LiteralPath $cilj -Recurse -File | Where-Object {
        -not $oddaljene.ContainsKey(($_.FullName.Substring($cilj.Length + 1) -replace '\\', '/'))
    }
    $odvec | Remove-Item -Force

    # 5) preverjanje: vse datoteke in velikosti se ujemajo
    $napacne = foreach ($p in $oddaljene.Keys) {
        $lok = Join-Path $cilj ($p -replace '/', '\')
        if (-not (Test-Path -LiteralPath $lok) -or (Get-Item -LiteralPath $lok).Length -ne $oddaljene[$p]) { $p }
    }
    if ($napacne) { throw "po prenosu se ne ujema $(@($napacne).Count) datotek" }

    # 6) je strežnik kopijo sploh naredil v zadnjih 2 dneh?
    $starost = ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - [int64]$zadnja) / 3600
    if ($starost -gt 48) { Obvesti 'Varnostna kopija je stara' ("Zadnja uspešna kopija na strežniku je stara {0:N0} ur." -f $starost) }

    Zapisi ("OK: {0} datotek, preneseno {1}, odstranjeno {2}, kopija stara {3:N1} h" -f $oddaljene.Count, @($manjka).Count, @($odvec).Count, $starost)
}
catch {
    Zapisi "NAPAKA: $($_.Exception.Message)"
    Obvesti 'NAPAKA: prenos kopije na namizni' $_.Exception.Message
    exit 1
}
