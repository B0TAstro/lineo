# Suivi de balle

Comment l'app trouve la balle dans le replay d'un point, en **v0.5**, sans modèle de vision : OpenCV pour les pixels, de la géométrie en TypeScript pour le reste. Le suivi ne tourne que sur le point affiché, quand l'interrupteur « Tracking » du replay est allumé ; jamais pendant qu'on filme. Il montre une trajectoire, jamais un dedans / dehors. Les réglages et leurs mesures sont dans [`CLAUDE.md`](../CLAUDE.md#balle-suivie-v05).

Image pour les slides : [`images/tracking.png`](images/tracking.png) (`npm run docs:images -- tracking` la regénère depuis ce fichier).

```mermaid
%%{init: {'theme':'base','flowchart':{'wrappingWidth':460},'themeVariables':{'fontFamily':'Helvetica, Arial','fontSize':'15px','primaryColor':'#FFFFFF','primaryTextColor':'#0A0A0A','primaryBorderColor':'#161816','lineColor':'#0A0A0A','clusterBkg':'#F5F6F4','clusterBorder':'#161816'}}}%%
flowchart TB
  REPLAY["🎬 <b>Replay d'un point</b> · interrupteur « Tracking » allumé<br/>le temps à l'écran est <b>t</b>"]
  COURT["🎾 <b>Terrain de la session</b><br/>lieu + surface → réglages<br/><i>ballConfigFor</i>"]

  subgraph LIRE["1 · Lire les images · module natif clip-frames"]
    direction LR
    L1[("Fichier .mp4<br/>du point")]
    L2["Images de <b>t − 1,5 s</b> à <b>t + 1,5 s</b><br/>une à la fois, 1280 px de large, RGB"]
    L1 --> L2
  end

  subgraph DETECTER["2 · Dans chaque image, trouver ce qui passe · OpenCV · native/OpenCvDetector"]
    direction LR
    D1["Comparer l'image à celles<br/>de 30 ms avant<br/>et 30 ms après"]
    D2["Garder ce qui est<br/>plus clair <b>et</b> plus jaune<br/>que les deux"]
    D3["Écarter la peau<br/>plus rouge que verte"]
    D4["Garder les taches<br/>de la taille d'une balle,<br/>dans une petite zone<br/>qui bouge"]
    D5(["<b>Candidats</b><br/>environ 1,3 par image<br/>balle, chaussure, reflet…"])
    D1 --> D2 --> D3 --> D4 --> D5
  end

  subgraph SUIVRE["3 · Sur toutes les images à la fois, trouver la balle · TypeScript pur · logic/trackClip"]
    direction LR
    S1["<b>withoutResidents</b><br/>retirer ce qui reste<br/>sur place : pied,<br/>feuille, spectateur"]
    S2["<b>findArcs</b><br/>3 taches alignées<br/>→ une parabole, qui ramasse<br/>les taches proches"]
    S3["Garder l'arc<br/>s'il a 6 taches,<br/>s'il voyage<br/>et s'il retombe"]
    S4["<b>linkArcs</b><br/>une seule balle :<br/>la chaîne d'arcs la plus vue,<br/>coupée aux frappes<br/>et aux rebonds"]
    S5(["<b>Balle de chaque image</b><br/>position, vitesse<br/>détectée ou prédite"])
    S1 --> S2 --> S3 --> S4 --> S5
  end

  subgraph DESSINER["4 · Dessiner sur la vidéo · ui/BallTrackOverlay et ui/BallHud"]
    direction LR
    V1["Traîne des 32<br/>dernières positions"]
    V2["Cercle <b>jaune</b> : balle détectée<br/>Cercle <b>orange</b> : balle prédite"]
    V3["Flèche rouge :<br/>vitesse"]
    V4["Bandeau : % de balle vue,<br/>position, vitesse,<br/>temps de calcul"]
    V1 ~~~ V2 ~~~ V3 ~~~ V4
  end

  REPLAY --> LIRE --> DETECTER --> SUIVRE --> DESSINER
  COURT -.-> DETECTER
  COURT -.-> SUIVRE

  NOTE["<b>Pas de modèle de vision.</b><br/>Le temps à l'écran avance : on lit la suite,<br/>la trajectoire est recalculée toutes les 30 images lues.<br/>Ce qui a été lu est gardé (8 s) : reculer ou mettre<br/>en pause ne relit rien."]
  DESSINER ~~~ NOTE

  classDef step fill:#FFFFFF,stroke:#161816,stroke-width:2px,color:#0A0A0A
  classDef result fill:#F6FCDC,stroke:#0A0A0A,stroke-width:2px,color:#0A0A0A
  classDef ui fill:#0A0A0A,stroke:#0A0A0A,color:#FFFFFF
  classDef note fill:#FFFFFF,stroke:#0A0A0A,stroke-dasharray:4 3,color:#0A0A0A
  class L1,L2,D1,D2,D3,D4,S1,S2,S3,S4,V1,V2,V3,V4 step
  class D5,S5,COURT result
  class REPLAY ui
  class NOTE note
```

## Les quatre étapes

**1 · Lire les images.** `ReplayBallTracker` suit le temps à l'écran et demande au module natif `modules/clip-frames` les images du fichier, de 1,5 s avant à 1,5 s après. Un replay est un fichier : la suite d'une image est connue autant que ce qui la précède, et le suivi s'en sert. Les images sont lues en 1280 px de large, parce qu'une balle au fond du court ne fait que 2 à 10 px.

**2 · Trouver ce qui passe.** Une image seule ne suffit pas : la balle fait quelques pixels parmi les gradins, les vêtements et les ombres. Ce qui la distingue, c'est qu'elle passe. À sa place, l'image est plus claire et plus jaune qu'un instant avant **et** qu'un instant après. Une ombre qui arrive est plus sombre, un maillot est encore là l'image d'après, un bras est plus rouge que vert. Il n'y a pas de seuil de couleur absolu : à 2 px, la couleur de la balle se mélange à celle du fond. Le détecteur répond donc avec 1 ou 2 images de retard, le temps de connaître l'image d'après.

**3 · Trouver la balle parmi les candidats.** Le détecteur laisse passer d'autres taches que la balle. Ce qui distingue la balle, cette fois, c'est sa trajectoire : en vol, elle suit une parabole, image après image (tracker de Yan, Christmas et Kittler, BMVC 2005).

- `withoutResidents` retire d'abord ce qui habite au même endroit. La caméra ne bouge pas pendant un point, la balle ne fait que passer.
- `findArcs` part de trois taches proches dans le temps et à peu près alignées, ajuste une parabole, y ajoute les taches proches et recommence. Un rebond ou une frappe casse la parabole : l'arc s'arrête là.
- Un arc est gardé s'il passe par 6 taches au moins, s'il voyage (une tache qui scintille ne voyage pas) et s'il se courbe vers le bas (une balle retombe, une chaussure qui glisse va tout droit).
- `linkArcs` enchaîne les arcs : il n'y a qu'une balle, donc une seule chaîne, celle qui est vue sur le plus d'images. Deux arcs qui se croisent sont coupés au croisement : c'est la frappe ou le rebond.

Sur chaque image, la balle est « détectée » (une tache est sur l'arc) ou « prédite » (pas de tache, l'arc passe quand même par là).

**4 · Dessiner.** Le calque est posé sur la vidéo et zoome avec elle. Le bandeau donne les chiffres de l'image à l'écran.

## Où c'est dans le code

Tout est dans `src/features/ball-tracking/`.

| Fichier | Rôle |
|---|---|
| `useBallTrack.ts` | Le hook du replay : construit le suivi avec les réglages du terrain |
| `ReplayBallTracker.ts` | Le chef d'orchestre : suit le temps à l'écran, lit, détecte, recalcule, publie |
| `native/ClipFrames.ts` | Les images d'un fichier (module natif `modules/clip-frames`) |
| `native/OpenCvDetector.ts` | Étape 2, le seul fichier qui touche à OpenCV |
| `logic/trackClip.ts` | Étape 3 : `withoutResidents` → `findArcs` → `linkArcs` |
| `logic/ballConfig.ts`, `logic/ballConfigFor.ts` | Les réglages, et ce qu'un terrain y change |
| `ui/BallTrackOverlay.tsx`, `ui/BallHud.tsx` | Étape 4 : le calque et le bandeau |

Tout tourne sur le téléphone. `logic/` est du TypeScript pur : il ne dépend ni de React ni d'OpenCV.

## Quand le dessin ne colle pas à la balle

Mettre en pause et avancer image par image, puis regarder le bandeau.

| Ce qu'on voit | Ce que ça veut dire |
|---|---|
| En pause, pas de cercle, bandeau `ÉTAT PERDUE` | La balle n'a pas été trouvée sur cette image : détection ou suivi, pas l'affichage |
| En pause, le cercle est sur autre chose (un pied, une raquette) | Un mauvais arc a été gardé : suivi |
| En pause c'est juste, en lecture le cercle est en retard ou disparaît | L'analyse va moins vite que la lecture : regarder « ms / image » et « trajectoire » dans le bandeau. Avec plus de 0,5 s de retard, elle repart 0,2 s avant le temps à l'écran |
| En pause, le cercle est toujours à côté de la balle, du même côté | Le calque est mal posé sur la vidéo (rotation du fichier, caméra avant) |

## Limites connues

- La balle contre un joueur, au moment de la frappe, n'est pas détectée ; le suivi fait le pont entre les deux vols.
- Une balle devant le ciel ou un mur clair n'est pas « plus claire qu'avant et après » : elle disparaît.
- Les réglages sont mesurés sur une seule vidéo (dur, extérieur, 30 images par seconde). Les autres terrains gardent ces réglages tant qu'ils n'ont pas été mesurés.
- Le mode « Balle live » (dev seulement) utilise encore l'ancien suivi image par image (filtre de Kalman) : il sert à régler la détection sur le court, pas à suivre.
