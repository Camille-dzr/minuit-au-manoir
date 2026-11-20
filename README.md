# Minuit au Manoir

Jeu web 2D coopératif pour deux joueuses. Deux chasseuses de fantômes sont enfermées dans le salon d’un manoir hanté. Elles ont **5 minutes** pour retrouver trois reliques maudites, les poser sur la cheminée et sortir avant minuit. Chacune voit des indices que l’autre ne voit pas : il faut se parler.

## Lancer le jeu chez soi

Il faut [Node.js](https://nodejs.org) 18 ou plus récent. Dans PowerShell, depuis le dossier du jeu :

```powershell
cd "$HOME\OneDrive\Bureau\JEUX\minuit-au-manoir"
pnpm install
pnpm start
```

Ouvre ensuite **http://localhost:3000** dans deux fenêtres de navigateur (par exemple une fenêtre normale et une fenêtre privée), une par joueuse.

- Pour changer de port : `$env:PORT=4000; pnpm start`
- Pour lancer les tests automatiques, qui jouent une partie complète puis une défaite : `pnpm test`

## Jouer avec une pote sur un autre appareil

### Option rapide (le temps d’une soirée) : un tunnel depuis ton ordinateur

Le jeu tourne sur ton PC, et un lien public temporaire y mène. Ton PC doit rester allumé.

1. Installe l’outil Cloudflare une seule fois : `winget install --id Cloudflare.cloudflared`
2. Lance le jeu (`pnpm start`), puis, dans une **deuxième** fenêtre PowerShell : `cloudflared tunnel --url http://localhost:3000`
3. Une adresse en `https://….trycloudflare.com` s’affiche. Ouvre-la, clique sur « Créer une partie », puis sur « Copier le lien d’invitation », et envoie ce lien à ta pote.

### Option durable : un lien permanent sur Render (gratuit)

Le serveur garde une connexion temps réel ouverte (Socket.IO). Il faut donc un hébergeur qui laisse tourner un serveur Node.js. Vercel ne convient pas, Render oui.

1. Mets le dossier sur GitHub (un dépôt privé suffit).
2. Crée un compte sur https://render.com, puis choisis **New → Blueprint** et sélectionne le dépôt. Le fichier `render.yaml` configure tout seul le service, sur l’offre gratuite.
3. Après 2 à 3 minutes, Render donne une adresse du type `https://minuit-au-manoir.onrender.com`. C’est le lien à envoyer.

Sur l’offre gratuite, le serveur s’endort après 15 minutes sans visite. La première ouverture prend alors environ 50 secondes.

## Comment on joue

| | Joueuse 1 (crée le salon, couleur dorée) | Joueuse 2 (rejoint, couleur bleu lune) |
|---|---|---|
| Énigme 1 | voit 3 symboles dans le **miroir** | les entre sur le **coffret** → clé en argent |
| Énigme 2 | allume les **4 bougies** | voit leur ordre dans le **portrait** → bague maudite |
| Énigme 3 | voit les **gravures de la cheminée** | fouille l’**horloge** → médaillon |
| Fin | les deux devant la cheminée pour poser les reliques, puis les deux passent la porte | |

- Se déplacer : flèches ou ZQSD
- Interagir : E, Espace ou Entrée
- Écrire dans le chat : T
- Fermer une fenêtre : Échap

Les objets qui scintillent dans ta couleur t’attendent.

## Structure

- `server.js` : l’arbitre de la partie. Il gère les salons, garde les solutions secrètes, valide chaque action et tient le chrono.
- `public/shared.js` : les données communes au serveur et au navigateur (positions du décor, rôles, options de personnalisation).
- `public/character.js` : le dessin des chasseuses (coiffures, tenues, accessoires, expressions, marche).
- `public/room.js` : le dessin du salon (lumières, portraits qui suivent du regard, rayon de lune, fantôme).
- `public/main.js` : les écrans, le réseau, les déplacements et les fenêtres d’énigmes.
- `test/partie-complete.test.js` : deux joueuses simulées jouent une victoire, puis une défaite au chrono.
