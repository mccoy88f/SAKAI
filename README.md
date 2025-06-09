# SAKAI - Swiss Army Knife for Artificial Intelligence

[👉 Vai alla Web App](https://mccoy88f.github.io/SAKAI/)

SAKAI è un'applicazione web pensata per **organizzare e lanciare piccoli progetti creati da intelligenze artificiali**, che spesso vengono generati e poi dimenticati o dispersi tra i file locali. Con SAKAI puoi dare loro uno spazio ordinato e permanente, accessibile in pochi click.

Il nome **SAKAI** è l'acronimo di **Swiss Army Knife (for) Artificial Intelligence**: un coltellino svizzero digitale progettato per aiutarti a gestire micro-progetti, esperimenti e utility create da AI, ma anche adatte all'uso umano.

---

## ✨ Funzionalità principali

- **Importa app**: trascina file `.html` o `.zip` contenenti mini-progetti nel launcher
- **Aggiungi web app**: inserisci nome e URL di servizi online da integrare
- **Organizza le tue app**: emoji personalizzate, dettagli, descrizione e autore
- **Esporta e importa profili**: salva tutto in un file `.sakaiprofile` da riaprire in futuro
- **Supporto drag & drop**, UI animata e responsive, senza installazione

---

## 📦 Cosa sono le SAK App?

Le applicazioni caricate in SAKAI vengono chiamate **SAK app**.

- Ogni SAK app è un piccolo progetto **standalone** in HTML/JS, pensato per essere lanciato direttamente nel browser.
- Le app possono essere generate da IA (es. ChatGPT, Copilot, Claude) o create manualmente.
- Al momento sono supportati solo file `.html` e `.zip` contenenti HTML e JavaScript.
- 🔜 **In arrivo**: supporto per altri formati (es. script Python con interfaccia web o applet in WebAssembly).

---

## 🚀 Creare una SAK App Ottimale

Per far sì che la tua SAK app si integri al meglio con il launcher, puoi arricchire il tuo file HTML con metadati specifici che SAKAI è in grado di leggere e visualizzare.

### 📝 Nome, Autore e Descrizione

SAKAI estrae le informazioni direttamente dai tag `<meta>` presenti nell'`<head>` del tuo file HTML.

1.  **Nome App**: Viene ricavato direttamente dal nome del file (es. `mia-calcolatrice.html` diventerà "mia-calcolatrice").
2.  **Autore**: Inserisci il tag `<meta name="author" content="...">`.
3.  **Descrizione**: Inserisci il tag `<meta name="description" content="...">`.

### 🖼️ Icona dell'App

L'icona viene gestita con questa priorità:

1.  **Favicon (consigliato)**: SAKAI cercherà un tag `<link rel="icon" href="...">` nel tuo HTML. Per risultati ottimali, usa un **URL assoluto** (es. un link a un'immagine su un CDN) o un'immagine codificata in **Data-URI**.
2.  **Emoji di Fallback**: Se non viene trovata una favicon o se il link non è valido, SAKAI assegnerà un'emoji casuale all'app.
3.  **Emoji personalizzata**: Puoi sempre cambiare l'icona con un'emoji a tua scelta dal pannello "Informazioni" dell'app (cliccando sulla `i`).

### Esempio di un file `app.html` completo

Ecco un esempio di `head` per un file HTML che sfrutta tutte le funzionalità di SAKAI:

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>La Mia Fantastica App</title>

    <meta name="author" content="Mario Rossi">
    <meta name="description" content="Questa è una breve descrizione della mia fantastica app che fa cose incredibili.">

    <link rel="icon" href="[https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png](https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png)">

</head>
<body>
    <h1>La Mia Fantastica App</h1>
</body>
</html>
```

## 📁 Creare una SAK App da file `.zip`

Puoi importare anche app in formato `.zip`. Ecco come prepararle:

### ✅ Requisiti:

- Il file `.zip` **deve contenere almeno un file `.html` o `.htm`**.
- Ogni `.html` verrà trattato come una SAK app separata.
- Il file `.html` dovrebbe:
  - Essere **autosufficiente** (cioè, avere tutto inline)
  - Oppure includere **JS/CSS esterni** con percorsi **relativi** coerenti (es. `./style.css`)
- Non usare **path assoluti** (es. `/home/utente/...` o `C:\Users\...`)
- File `.zip` **senza file `.html`** saranno ignorati.

### ❗ Limiti attuali:

> Le risorse presenti nello zip **non vengono servite da un web server interno**, quindi non è garantito il corretto funzionamento di app complesse con molte dipendenze.

📌 **Suggerimento**: per ora funzionano meglio app con tutto inline in un singolo `.html`.

---

## ⚙️ Modalità d'uso

🔗 **Web App (consigliata):**  
[https://mccoy88f.github.io/SAKAI/](https://mccoy88f.github.io/SAKAI/)

💻 **Esecuzione locale:**  
Apri il file `SAK Launcher - FINAL V2.html` direttamente nel tuo browser. Nessuna installazione richiesta.

🖥️ **In sviluppo:**  
Una versione **multipiattaforma (Windows, macOS, Linux)** con tecnologia **Electron** per un’esperienza desktop nativa.

---

## 🔐 Privacy e sicurezza

- Tutti i dati vengono **salvati in locale**, nel tuo browser, tramite **LocalStorage**.
- Il link GitHub Pages non raccoglie né memorizza informazioni personali.
- Puoi esportare le tue app in un profilo `.sakaiprofile` per backup o condivisione.

---

## 🧪 Tecnologie utilizzate

- HTML5, CSS3 (UI moderna con animazioni e glassmorphism)
- JavaScript (struttura OOP e modularità)
- [JSZip](https://stuk.github.io/jszip/) per gestione dei profili e archivi
- LocalStorage per la persistenza lato client

---

## 👤 Autore

Creato da [McCoy88f](https://github.com/McCoy88f)

---

## 📄 Licenza

Distribuito sotto licenza **MIT**. Sentiti libero di contribuire, clonare o adattare.
